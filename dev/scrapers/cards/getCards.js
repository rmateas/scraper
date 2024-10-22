import { chromium } from 'playwright';

import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { getCardsFromDealer } from './utils/getVehCards.js';
import log from '../../utils/logger/logger.js';

let file = 'getCards.js';
let func = 'getCards';
let page;

export const getCards = async (wsEndpoint, worker, proxy) => {
  log({file, func, worker, message:'START'});

  try {
    let browserConnect = await chromium.connect(wsEndpoint);
    let context = await browserConnect.newContext();
    page = await context.newPage();
  } catch (error) {
    await log({file, func, level:'error', worker, message:'ERROR CONNECTING TO BROWSER', error});
    //Set special exit code for when connecting to browser fails so that the browser can be tested
    //503 proxy error
    process.exit(503);
  }

  let seller = (await getAPI(worker, `${process.env.HOST}/cards/get`))[0];
  
  let cards = {
    sellerId:seller.sellerId,
    sellerTemplate:seller.sellerTemplate,
    vehCardUrlArr: [],
    scraped:{
      scrapeDate:new Date(),
      scrapeOutcome:'SUCCESS',
      vehNumTotalUsed: 0,
      vehNumTotalNew: 0,
      vehNumTotal: 0
    }
  };
  try {
    log({file, func, worker, message:`SCRAPING USED CARDS ON: ${seller.pageInvUrlUsed}`});
    let vehCardsUsed = await getCardsFromDealer(page, worker, seller, false);
    console.log('vehCardsUsed', vehCardsUsed);
    
    cards.scraped.vehNumTotalUsed = vehCardsUsed.vehCardArr.length;
    cards.scraped.vehNumPerPageUsed = vehCardsUsed.vehCardsPerPageArr;
    cards.vehCardUrlArr = vehCardsUsed.vehCardArr;

    if (seller.pageInvUrlNew) {
      log({file, func, worker, message:`SCRAPING NEW CARDS ON: ${seller.pageInvUrlNew}`});
      let vehCardsNew = await getCardsFromDealer(page, worker, seller, true);
      console.log('vehCardsNew', vehCardsNew);
      
      cards.scraped.vehNumTotalNew = vehCardsNew.vehCardArr.length;
      cards.scraped.vehNumPerPageNew = vehCardsNew.vehCardsPerPageArr;
      cards.vehCardUrlArr.push.apply(cards.vehCardUrlArr, vehCardsNew.vehCardArr);
    }
    cards.scraped.vehNumTotal = cards.scraped.vehNumTotalNew + cards.scraped.vehNumTotalUsed;
  } catch (e) {
    cards.scraped.scrapeErr = { errMessage: e.message };
    cards.scraped.scrapeOutcome = 'FAIL';
  }finally {
    log({file, func, worker, message:`SCRAPING CARDS END | Total cards found: ${cards.vehCardUrlArr.length}`});
    await postAPI(worker, `${process.env.HOST}/cards/insert`, JSON.stringify(cards));
  }
}