import {setTimeout} from 'node:timers/promises';

import {log} from './logger/logger.js';

const file = 'navigation.js';

/**
 * 
 * @param {Object} page 
 * @param {number} worker 
 * @param {string} url
 * 
 * @return {Object} 
 */
export const pageNav = async (page, worker, url) => {
  log({file, func:'pageNav', worker, message:`START: ${url}`});

  let isRedirect = async (res) => {
    //playwright specific
    let isRedirect = res.request().redirectedTo();
    if(isRedirect){
      log({file, func:'pageNav', worker, message:`REDIRECT TO: ${isRedirect}`});
      return true;
    }
    return false;
  }

  let isCaptcha = async () => {
    return await page.evaluate(() => document.evaluate('//iframe[contains(@src, "geo.captcha-delivery.com")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) ? true : false;
  }

  let isBotDetector = async () => {
    // let botCounter = 0;
    // let timeout1;
    // while((await page.evaluate(() => document.evaluate('//*[contains(text(), "This process is automatic. Your browser will redirect to your requested content shortly")]', document, null,XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) || await page.$('.cf-im-under-attack')) && botCounter < 3){
    //   botCounter++;
    //   timeout1 = await setTimeout(7000);
    //}
    // if (botCounter > 2){
    //   clearTimeout(timeout1);
    //   return true;
    //}
    return await page.$('.cf-im-under-attack') != null ? true : false;
  }

  let reqFail;

  page.on('requestfailed', request => {
    reqFail = request.failure();
  });

  let browErrHandler = () => {
    return reqFail?.errorText == 'net::ERR_TUNNEL_CONNECTION_FAILED' ? `FAIL | No response from site server | ${reqFail.errorText}` : `${reqFail?.errorText}` || 'UnknownReason';
  }

  let attemptNav = async (loadTrigger) => {
    let res;
    try {
      res = await page.goto(url, {waitUntil:loadTrigger, timeout:20000});
      if (await isBotDetector()) {
        return {status: false, url, loadTrigger, message: `FAIL | Stuck on bot validation`};
      } else if (await isCaptcha()) {
        return {status: false, url, loadTrigger, message: `FAIL | Captcha`};
      } else if (await isRedirect(res)) {
        return {status: false, url, loadTrigger, message: 'FAIL | Page redirect'};
      }
    } catch (error) {
      if(loadTrigger == 'domcontentloaded' && error.message.includes('Timeout')) {
        return await attemptNav('networkidle');
      } else {
        log({level: 'error', file, func:'attempNav', worker, message:'FAIL NAV', error});
        return {status: false, url, loadTrigger, message: browErrHandler()};
      }
    }
    return {status: true, url, loadTrigger, message: 'SUCCESS'};
  }

  return await attemptNav('domcontentloaded');
};