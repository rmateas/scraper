import 'dotenv/config';
import { cpus } from 'os';
import cluster from 'node:cluster';
import { setTimeout } from 'node:timers/promises';

import { startBrowsers } from '../browser/browser.js';
import { getCards } from './cards/getCards.js';
// import { getSInfo } from './sinfo/getSInfo.js';
// import { getVInfo } from './vinfo/getVInfo.js';
import { getPagination } from './pag/getPagination.js';
import { log } from '../utils/logger/logger.js';


// Specify scraper that is being started, set from the package.json start script
const scraper = process.argv[2];

const file = 'startScraper.js';
/**
 * Async func to conatin awaits, easier to read than top-level await
 */
(async () => {
  /**
   * The if statement separates what is executed in the parent process and what is executed in the workers 
   * Parent process
   */
  if(cluster.isPrimary) {
    console.log('PARENT START');
    log({file, func:'main', message:`${scraper.toUpperCase()} | SCRAPER START`});
    /**
     * DEV ONLY
     * ENV VARIABLES
     */  
    if(/dev(eleopment)?/i.test(process.env.NODE_ENV)){
      process.env.HOST = 'http://localhost:8080';
      process.env.WORKERS = 1;
      process.env.DEBUG = true;
      try {
        await fetch(`${process.env.HOST}/new-image`);
      } catch (error) {
        console.log('LOCAL API ERROR');
        console.log(error);
        process.exit();
      }
    } else {
      // console.log('DEBUG logs not going to be printed');
      process.env.HOST = 'https://as-webs-api.azurewebsites.net';
      // process.env.WORKERS = cpus().length;
      process.env.WORKERS = 1;
    }

    let browsers = [];

    // ******************* refactor sig handler to handle playwright endpoint rather than puppeteer endpoint
    
    /**
     * Signal handler for process exit to make sure that all browsers close
     */
    // let endSignalHandler = async () =>  {
    //   log({file, func:'endSignalHandler', message:`CLOSING ${browsers.length} BROWSERS`});
    //   try {
    //     for(let browser of browsers){
    //       let { browserWSEndpoint } = browser;
    //       brow = await chromium.connect({browserWSEndpoint});
    //       await brow.close();
    //     }
    //   } catch (e) {
    //     console.log(e);
    //   } finally {
    //     log({file, func:'endSignalHandler', message:'ALL BROWSERS CLOSED'});
    //     log({file, func:'endSignalHandler', message:'EXITING PROCESS'});
    //     process.exit(0);
    //   }
    // }
    
    // process.on('SIGINT', endSignalHandler);
    // process.on('SIGTERM', endSignalHandler);
    // process.on('SIGQUIT', endSignalHandler);
    
    let workers = Array.apply(undefined, Array(+process.env.WORKERS)).map(()=>{});

    let browserNum = workers.length*2;
    browsers = await startBrowsers(browserNum);
    if(browsers.length != browserNum){
      workers.slice(browserNum - browsers.length);
    }
  
    /**
     * 
     * @param {int} worker 
     * @returns {object}
     */
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
        let len = await (await fetch(`${process.env.HOST}/seller/arrlen/${scraper}`)).json();
        if('data' in len && len.data){
          for (let i = 0; i < workers.length; i++) {
            workers[i] === undefined && await spawnWorker(i);
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
      let brow = await pickBrowser(workerNum, browsers);
      let worker = cluster.fork();
      workers[i] = {worker:worker.process.pid, browNum:brow.browserNum};
      worker.on('message', async msg => {

        //https://github.com/nodejs/node/issues/39854 
        //creating the worker and then immediately sending a message creates a race condition due to ESM modules being loaded asynchronously
        worker.send({worker:workerNum, wsEndpoint:brow.wsEndpoint});
      });
      log({level:'debug', file, func:'spawnWorker', worker: workerNum, message:'SUCCESSFULLY STARTED WORKER'});
    }
    
    cluster.on('exit', async (worker, code) => {
      let workerIndex = workers.map(el => el?.worker).indexOf(worker.process.pid);
      log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITING'});
      browsers[workers[workerIndex].browNum].working = 0;
      if(code == 10) {
        //browser connection error
        log({level:'debug', file, func:'workerExit', worker:workerIndex, message:'WORKER EXITED WITH BROWSER CONNECTION ERROR'});
        spawnWorker(workerIndex);
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
      let {worker, wsEndpoint} = msg;

      //PLAYWRIGHT TEST
      // try {
      //   let page = await context.newPage();
      //   page.once('load', () => console.log('Page loaded!'));
      //   await page.goto('https://arh.antoinevastel.com/bots/areyouheadless');
      //   await page.screenshot({path: `test${(new Date()).getMinutes()}.png`, fullPage: true});
      // } catch (error) {
      //   console.log(error);
      // }


      //CODE EXECUTION
      try {
        log({level:'debug', file, func:'message', worker, message:'STARTING SCRAPER'});
        scraper == 'pagination' ? await getPagination(wsEndpoint, worker) :
        // scraper == 'sinfo' ? await getSInfo(page, worker) :
        // scraper == 'vinfo' ? await getVInfo(page, worker) :
        // scraper == 'cards' ? await getCards(page, worker) :
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