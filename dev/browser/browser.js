import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

import { log } from '../utils/logger/logger.js';
import proxies from './proxies.json' with { type: "json"};

export const startBrowsers = async (browNum) => {
  log({file:'browser.js', func:'startBrowsers', message:'STARTING BROWSERS'});
  let browsers = [];

  for(let i = 0; i < browNum; i++){
    let browser
    try {
      //args options | //https://peter.sh/experiments/chromium-command-line-switches/
      browser = await puppeteer.launch({
        headless:false,
        //possiblity that headless mode is acting differently than headful
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
      log({file:'browser.js', func:'startBrowsers', level:'fatal', error:`ERROR LAUNCHING BROWSER\n ${e}`});
      process.exit();
    }
    
    try {
      let page = (await browser.pages())[0];
      await page.authenticate({'username':process.env.PUSER,'password':process.env.PPASS});
    } catch (e) {
      log({file:'browser.js', func:'browserAuth', level:'fatal', error:`AUTH ERROR\n ${e}`});
      process.exit();
    }

    
    let endpoint = browser.wsEndpoint();
    browsers[i] = {
      browserNum:i,
      endpoint,
      proxy:proxies[i],
      working:false,
      conErr:0
    }
  }
  log({file:'browser.js', func:'startBrowsers', message:`BROWSERS STARTED: ${browsers.length}`});
  return browsers;
};