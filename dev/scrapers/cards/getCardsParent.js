import 'dotenv/config';
import { cpus } from 'os';
import cluster from 'node:cluster';
import { setTimeout } from 'node:timers/promises';

import puppeteer from "puppeteer-extra";

import { startBrowsers } from '../../browser/browser.js';
import { getCards } from './getCardsChild.js';
import { initializeLogger, logger } from '../../utils/logger.js';

(async () => {
  //Parent process
  if(cluster.isPrimary) {
    let browsers = [];
    let signalHandler = async () =>  {
      console.log(`CLOSING ${browsers.length} BROWSERS`);
      try {
        for(let browser of browsers){
          let {browserWSEndpoint} = browser
          brow = await puppeteer.connect({browserWSEndpoint});
          await brow.close();
        }
      } catch (e) {
        console.log(e);
      }
      console.log('ALL BROWSERS CLOSED');
      console.log('EXITING PROCESS');
      process.exit(0);
    }
    
    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);
    process.on('SIGQUIT', signalHandler);

    console.log('START');
    let workers = [];
    let workersTotal = cpus().length;
    initializeLogger(workersTotal);
    browsers = await startBrowsers(workersTotal*2);
    
    let pickBrowser = async (worker) => {
      let rndNum = Math.floor(Math.random() * browsers.length);
      let browser = browsers[rndNum];
      if(browser.working){
        await setTimeout(7000);
        return await pickBrowser(worker);
      } else {
        browsers[rndNum].working++;
        return browser;
      }
    }
    
    let checkWorkers = async () => {
      try {
        let len = await (await fetch(`https://as-webs-api.azurewebsites.net/vehicle/arrlen`)).json();
        if('data' in len && len.data){
          for (let i = 0; i < workersTotal; i++) {
            if(workers[i] === undefined){
              spawnWorker(i);
            }
          }
          await setTimeout(600000);
          await checkWorkers();
        } else {
          await setTimeout(600000);
          await checkWorkers();
        }
      } catch (e) {
        await setTimeout(1800000);
        await checkWorkers();
      }
    }

    let spawnWorker = async (i) => {
      let worker = cluster.fork();
      let brow = await pickBrowser(i+1);
      workers[i] = {worker:worker.process.pid, browNum:brow.browserNum};
      worker.send({browserWSEndpoint:brow.endpoint});
    }
    
    cluster.on('exit', async (worker, code) => {
      let workerIndex = workers.map(el => el.worker).indexOf(worker.process.pid);
      browsers[workers[workerIndex].browNum].working = 0;
      if(code == 8000) {
        workerIndex = undefined;
      } else {
        spawnWorker(workerIndex);
      }
    });
    
    await checkWorkers();

  } else {
    process.on('message', async message => {
      console.log('STARTED CHILD PROCESS');
      process.on('unhandledRejection', (e) => {throw new Error(e)});
      process.on("uncaughtException", (e) => {throw new Error(e)});
      let {browserWSEndpoint} = message;
      let browser, page;

      try {
        browser = await puppeteer.connect({browserWSEndpoint});
        page = (await browser.pages())[0];
      } catch (e) {
        console.log('ERROR CONNECTING TO BROWSER IN CHILD');
      }
      
      try {
        await getCards(page);
      } catch (e) {
        console.log('ERROR GETTING CARDS');
      } finally {
        process.exit();
      }
    });
  }
  
})();