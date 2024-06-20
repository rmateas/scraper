import { log } from './logger/logger.js';

const file = 'navigation.js';

export const pageNav = async (page, worker, url) => {
  log({file, func:'pageNav', worker, message:`START: ${url}`});

  let isRedirect = (res) => {
    let chain = res.request().redirectChain();
    if(chain.length){
      return new Error('FAIL : Page redirect');
    }
  }

  let isCaptcha = async () => {
    if(await page.evaluate(() => document.evaluate('//iframe[contains(@src, "geo.captcha-delivery.com")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue)){
      throw new Error(`FAIL : Captcha | ${url}`);
    }
  }

  let isBotDetector = async () => {
    let botCounter = 0;
    while(await page.evaluate(() => document.evaluate('//*[contains(text(), "This process is automatic. Your browser will redirect to your requested content shortly")]', document, null,XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) && botCounter < 3){
      botCounter++;
      await page.waitForTimeout(7000);
    }
    if (botCounter == 3){
      throw new Error(`FAIL : Stuck on bot validation | ${url}`);
    }
  }

  let reqFail;

  page.on('requestfailed', request => {
    reqFail = request.failure();
  });

  let browErrHandler = async () => {
    if(reqFail){
      if(reqFail.errorText == 'net::ERR_TUNNEL_CONNECTION_FAILED'){
        return new Error(`No response from site server | ${reqFail.errorText}`);
      }
    }
  }

  let attemptNav = async (loadTrigger) => {
    let res;
    try {
      res = await page.goto(url, {waitUntil:loadTrigger, timeout:20000});
    } catch (e) {
      return browErrHandler();
    }
    await isBotDetector();
    isRedirect(res);
    await isCaptcha();
    return true;
  }

  let navCheck = await attemptNav('domcontentloaded');
  if(navCheck instanceof Error){
    throw navCheck;
  } else if(navCheck != true){
    await attemptNav('networkidle2');
  }
};