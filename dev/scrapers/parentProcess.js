import 'dotenv/config';
import { cpus } from 'os';
import cluster from 'node:cluster';
import { setTimeout } from 'node:timers/promises';

import puppeteer from "puppeteer-extra";

import { startBrowsers } from '../browser/browser.js';
import { getCards } from './cards/getCards.js';
// import { getSInfo } from './sinfo/getSInfo.js';
// import { getVInfo } from './vinfo/getVInfo.js';
// import { getPag } from './pag/getPag.js';
import { log } from '../utils/logger/logger.js';

const file = 'startScraper.js';

(async () => {
  //Parent process
  if(cluster.isPrimary) {
    console.log('PARENT START');
    log({file, func:'main', level: 'info', message:'CARDS SCRAPER START'});
    let browsers = [];
    let endSignalHandler = async () =>  {
      log({file, func:'endSignalHandler', message:`CLOSING ${browsers.length} BROWSERS`});
      try {
        for(let browser of browsers){
          let { browserWSEndpoint } = browser;
          brow = await puppeteer.connect({browserWSEndpoint});
          await brow.close();
        }
      } catch (e) {
        console.log(e);
      }
      log({file, func:'endSignalHandler', message:'ALL BROWSERS CLOSED'});
      log({file, func:'endSignalHandler', message:'EXITING PROCESS'});
      process.exit(0);
    }
    
    process.on('SIGINT', endSignalHandler);
    process.on('SIGTERM', endSignalHandler);
    process.on('SIGQUIT', endSignalHandler);

    //PROD
    let workers = Array.apply(undefined, Array(cpus().length)).map(()=>{});

    //DEV
    // let workers = [undefined];

    let browserNum = workers.length*2
    browsers = await startBrowsers(browserNum);
    if(browsers.length != browserNum){
      workers.slice(browserNum - browsers.length);
    }
  
    let pickBrowser = async (worker) => {
      log({level:'debug', file, func:'pickBrowser', worker, message:'START'});
      let rndNum = Math.floor(Math.random() * browsers.length);
      let browser = browsers[rndNum];
      if(browser.working){
        log({level:'debug', file, func:'pickBrowser', worker, message:'BROWSER WORKING, TRYING AGAIN'});
        await setTimeout(7000);
        return await pickBrowser(worker);
      } else {
        log({level:'debug', file, func:'pickBrowser', worker, message:'SUCCESS'});
        browsers[rndNum].working++;
        return browser;
      }
    }

    let checkWorkers = async () => {
      log({level:'debug', file, func:'checkWorkers', message:'START'});
      try {
        let len = await (await fetch(`https://as-webs-api.azurewebsites.net/vehicle/arrlen`)).json();
        if('data' in len && len.data){
          for (let i = 0; i < workers.length; i++) {
            if(workers[i] === undefined) {
              await spawnWorker(i);
            }
          }
          log({level:'debug', file, func:'checkWorkers', message:'SUCCESSFULLY STARTED WORKERS'});
          await setTimeout(600000);
          await checkWorkers();
        } else {
          log({level:'debug', file, func:'checkWorkers', message:'NO DATA IN API'});
          await setTimeout(600000);
          await checkWorkers();
        }
      } catch (e) {
        log({level:'error', file, func:'checkWorkers', message:'ERROR CHECKING WORKERS', error:e});
        await setTimeout(1800000);
        await checkWorkers();
      }
    }

    let spawnWorker = async (i) => {
      let workerNum = i+1;
      log({level:'debug', file, func:'spawnWorker', worker: workerNum, message:'START'});
      let worker = cluster.fork();
      let brow = await pickBrowser(workerNum, browsers);
      workers[i] = {worker:worker.process.pid, browNum:brow.browserNum};
      worker.on('message', msg => {
        //https://github.com/nodejs/node/issues/39854 
        //creating the worker and then immediately sending a message creates a race condition due to ESM modules being loaded asynchronously
        worker.send({worker:workerNum, browserWSEndpoint:brow.endpoint});
      })
      log({level:'debug', file, func:'spawnWorker', worker: workerNum, message:'SUCCESSFULLY STARTED WORKER'});
    }
    
    cluster.on('exit', async (worker, code) => {
      let workerIndex = workers.map(el => el.worker).indexOf(worker.process.pid);
      log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITING'});
      browsers[workers[workerIndex].browNum].working = 0;
      if(code == 10) {
        //browser connection error
        log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITED WITH BROWSER CONNECTION ERROR'});
      } else if(code == 8000) {
        log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITED WITH ERROR'});
        workerIndex = undefined;
      } else {
        log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITED SUCCESSFULLY, SPAWNING NEW WORKER'});
        spawnWorker(workerIndex);
      }
    });
    
    await checkWorkers();

  } else if (cluster.isWorker) {
    process.on('message', async msg => {
      process.on('unhandledRejection', (e) => {log({level:'error', file, func:'unhandledRejection', message:'unhandledRejection', error:e})});
      process.on('uncaughtException', (e) => {log({level:'error', file, func:'uncaughtException', message:'uncaughtException', error:e})});
      let {worker, browserWSEndpoint} = msg;
      let browser, page;
      const scraper = process.argv[2];
      log({level:'debug', file, func:'message', worker, message:'STARTING CHILD PROCESS'});

      try {
        browser = await puppeteer.connect({browserWSEndpoint});
        page = (await browser.pages())[0];
      } catch (e) {
        log({level:'error', file, func:'message', worker, message:'ERROR CONNECTING TO BROWSER', error:e});
        process.exit(10);
      }
      
      try {
        // scraper == 'sinfo' ? await getSInfo(page, worker) :
        // scraper == 'vinfo' ? await getVInfo(page, worker) :
        // scraper == 'pag' ? await getPag(page, worker) : 
        scraper == 'cards' ? await getCards(page, worker) : 
        log({level:'ERROR', file, func:'message', worker, message:'SPECIFY SCRAPER'});
      } catch (e) {
        log({level:'error', file, func:'message', worker, message:'ERROR GETTING CARDS', error:e});
      } finally {
        log({level:'debug', file, func:'message', worker, message:'EXITING CHILD PROCESS'});
        process.exit();
      }
    });
    //necessary to proc message from parent and start scraper
    process.send('ping');
  }
  
})();