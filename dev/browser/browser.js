import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

import { logger } from '../utils/logger.js';
import proxies from './proxies.json' with { type: "json"};

export const startBrowsers = async (browNum) => {
  logger({file:'browser.js', func:'startBrowsers', message:'STARTING BROWSERS'});
  let browsers = [];

  for(let i = 0; i < 3; i++){
    let browser
    try {
      //args options | //https://peter.sh/experiments/chromium-command-line-switches/
      browser = await puppeteer.launch({
        headless:false,
        ignoreHTTPSErrors: true,
        args: [
          '--mute-audio',
          // `--no-sandbox`, // creates chrome for testing zombies when closing browsers
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
          `--proxy-server=${proxies[i]}`
        ]
      });
    } catch (e) {
      logger({file:'browser.js', func:'startBrowsers', level:'fatal', error:`ERROR LAUNCHING BROWSER\n ${e}`});
      process.exit();
    }
    
    try {
      let page = (await browser.pages())[0];
      await page.authenticate({'username':process.env.PUSER,'password':process.env.PPASS});
    } catch (e) {
      logger({file:'browser.js', func:'browserAuth', level:'fatal', error:`AUTH ERROR\n ${e}`});
      process.exit();
    }

    
    let endpoint = browser.wsEndpoint();
    browsers[i] = {
      browserNum:i,
      endpoint,
      proxy:proxies[i],
      working:0,
      conErr:0
    }
  }
  logger({file:'browser.js', func:'startBrowsers', message:`BROWSERS STARTED: ${browsers.length}`});
  return browsers;
};

export const pickBrowser = (worker, browsers) => {
  let rndNum = Math.floor(Math.random() * browsers.length);
  let browser = browsers[rndNum];
  if(browser.working){
    //Browsers do not update after the first call, there will be a time when this need to be updated so that browsers somehow refreshes or is accessible from outside the function parameters
    return pickBrowser(worker, browsers);
  } else {
    browsers[rndNum].working++;
    return browser;
  }
}