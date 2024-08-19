import 'dotenv/config';
import { chromium } from 'playwright';

import { log } from '../utils/logger/logger.js';
import proxies from './proxies.json' with { type: "json"};
import { shuffle } from '../utils/shuffle.js';

const file = 'browser.js';


export const startBrowsers = async (browNum) => {
  log({file, func:'startBrowsers', message:'STARTING BROWSERS'});
  if(browNum > proxies.length){
    log({file, func:'startBrowsers', message:`NOT ENOUGH PROXIES AVAILABLE, SETTING BROWSER NUMBER FROM ${browNum} TO ${proxies.length}`});
    browNum = proxies.length;
  }

  let browsers = [];
  let shuffledProxies = shuffle(proxies);

  let browserCount = 0;

  while(browsers.length != browNum){
    if(!shuffledProxies.length){break;}
    let browser;
    let pickedProxy = shuffledProxies.pop();

    let isDev = /dev(eleopment)?/i.test(process.env.NODE_ENV);
    let isHeadless = isDev ? false : 'new'
    try {
      //args options | //https://peter.sh/experiments/chromium-command-line-switches/
      browser = await chromium.launchServer({
        headless: isHeadless,
        ignoreHTTPSErrors: true,
        proxy:{
          server:pickedProxy,
          username:process.env.PUSER,
          password:process.env.PPASS
        },
      });
    } catch (error) {
      await log({file, func:'startBrowsers', level:'fatal', message: 'ERROR LAUNCHING BROWSER', error});
      continue;
    }

    let endpoint = browser.wsEndpoint();
    browsers[browserCount] = {
      browserNum:browserCount,
      endpoint,
      proxy:pickedProxy,
      working:false,
      conErr:0
    }
    browserCount++;
  }

  log({file, func:'startBrowsers', message:`BROWSERS STARTED: ${browsers.length}`});
  return browsers;
};

// let isSandbox = isDev ? '' : '--no-sandbox';
// chromium browser args
// args: [
  // '--mute-audio',
  // `${isSandbox}`, // creates chrome for testing zombies when closing browsers but is necessary for docker build
  // '--disable-setuid-sandbox',
  // '--aggressive-cache-discard',
  // '--disable-gpu',
  // `--disable-sync`,
  // '--disable-cache',
  // '--disable-application-cache',
  // '--disable-offline-load-stale-cache',
  // '--disable-gpu-shader-disk-cache',
  // '--disable-extensions',
  // '--disable-component-extensions-with-background-pages',
  // '--disable-default-apps',
  // '--no-default-browser-check',
  // '--autoplay-policy=user-gesture-required',
  // '--disable-background-timer-throttling',
  // '--disable-backgrounding-occluded-windows',
  // '--disable-notifications',
  // '--disable-background-networking',
  // '--disable-breakpad',
  // '--disable-component-update',
  // '--disable-domain-reliability',
  // '--media-cache-size=0',
  // '--disk-cache-size=0',
  // `--incognito`,
  // `--proxy-server=${pickedProxy}`
// ]