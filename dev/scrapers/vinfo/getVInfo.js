//Dealer Inspire|DealerOn|template1

import { setTimeout } from 'node:timers/promises';
import { performance as time } from 'perf_hooks';

import log from '../../utils/logger/logger.js';
import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { pageNav } from '../../utils/navigation.js';
import getVehInfo from './utils/getVehInfo.js';

const file = 'getVInfo.js';
const func = 'default';

export default async (wsEndpoint, worker, proxy) => {
  log({file, func, worker, message:'START'});

  try {
    let browserConnect = await chromium.connect(wsEndpoint);
    let context = await browserConnect.newContext();
    page = await context.newPage();
  } catch (error) {
    //Set special exit code for when connecting to browser fails so that the browser can be tested
    //503 proxy error
    process.exit(503);
  }

  let VehCardInfoArr = [];
  let APIData = await getAPI(worker, `${process.env.HOST}/vehicle/get/14`);
  
  for(let specs of APIData) {
    log({file, func, worker, message:`Current url: ${specs.url}`});
  
    let time1 = time.now();
    try {
      await pageNav(page, worker, specs.url);
      await page.addScriptTag({path: './sharedSnips/template/browserFunctions.js'});
      
      let getSpecs = await getVehInfo(page, worker, specs);
      let getSpecsKeys = Object.keys(getSpecs.carSpecs);
      for (let i = 0; i < getSpecsKeys.length; i++) {
        specs[getSpecsKeys[i]] = getSpecs.carSpecs[getSpecsKeys[i]];
      }
      if(getSpecs.errArr.length){
        specs.vehInfoErrs = {errDate: new Date(), errArr:getSpecs.errArr};
      }
    } catch (error) {
      specs.scrapeFail = {errDate: new Date(), errMessage: error.message, errStack: error.stack};
      log({file, func, worker, message:`FAIL | Error at ${specs.url}`, error});
    } finally {
      log({file, func, worker, message:`Scrape Time : ${(time.now() - time1).toString().split(".")[0]}ms | Vehicle : ${specs.url}`, obj:specs});
      VehCardInfoArr.push(specs);
      let time2 = time.now();
      if((time2 - time1) < 7000){
        await setTimeout((Math.random()*1000)+ (7000 - (time2 - time1)));
      }
    }
  }
  await postAPI(worker, `${qp.host}/vehicle/update`, JSON.stringify(VehCardInfoArr));
};