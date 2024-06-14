import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

import { log } from '../utils/logger/logger.js';
import proxies from './proxies.json' with { type: "json"};

const file = 'browser.js';

const shuffle = (a) => {
  let m = a.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = a[m];
    a[m] = a[i];
    a[i] = t;
  }
  return a;
}

export const startBrowsers = async (browNum) => {
  log({file, func:'startBrowsers', message:'STARTING BROWSERS'});
  if(browNum > proxies.length){
    log({file, func:'startBrowsers', message:'NOT ENOUGH PROXIES AVAILABLE, ADJUSTING'});
    browNum = proxies.length;
  }

  let browsers = [];
  let shuffledProxies = shuffle(proxies);

  let browserCount = 0;

  while(browsers.length != browNum){
    if(!shuffledProxies.length){break;}
    let browser;
    let proxy = shuffledProxies.pop();
    try {
      //args options | //https://peter.sh/experiments/chromium-command-line-switches/
      browser = await puppeteer.launch({
        // DEV
        // headless:false,
        
        // PROD
        headless:'new',
        
        ignoreHTTPSErrors: true,
        args: [
          '--mute-audio',
          `--no-sandbox`, // creates chrome for testing zombies when closing browsers but is necessary for docker build
          '--disable-setuid-sandbox',
          '--aggressive-cache-discard',
          '--disable-gpu',
          `--disable-sync`,
          '--disable-cache',
          '--disable-application-cache',
          '--disable-offline-load-stale-cache',
          '--disable-gpu-shader-disk-cache',
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--no-default-browser-check',
          '--autoplay-policy=user-gesture-required',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-notifications',
          '--disable-background-networking',
          '--disable-breakpad',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--media-cache-size=0',
          '--disk-cache-size=0',
          `--incognito`,
          `--proxy-server=${proxy}`
        ]
      });
    } catch (e) {
      await log({file, func:'startBrowsers', level:'fatal', message: 'ERROR LAUNCHING BROWSER', error:e});
      continue;
    }
    
    try {
      let page = (await browser.pages())[0];
      await page.authenticate({'username':process.env.PUSER,'password':process.env.PPASS});
    } catch (e) {
      await log({file, func:'browserAuth', level:'fatal', message:'AUTH ERROR', error:e});
      continue;
    }

    let endpoint = browser.wsEndpoint();
    browsers[browserCount] = {
      browserNum:browserCount,
      endpoint,
      proxy:proxy,
      working:false,
      conErr:0
    }
    browserCount++;
  }

  log({file, func:'startBrowsers', message:`BROWSERS STARTED: ${browsers.length}`});
  return browsers;
};