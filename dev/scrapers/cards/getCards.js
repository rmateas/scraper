import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { getCardsFromDealer } from './utils/getVehCards.js';
import { log } from '../../utils/logger/logger.js';

export const getCards = async (page, worker) => {
  let file = 'getCards.js';
  log({file, func:'getCards', worker, message:'START'});
  for(let seller of await getAPI('https://as-webs-api.azurewebsites.net/seller/getprod')){
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
      log({file, func:'getCards', worker, message:`SCRAPING USED CARDS ON: ${seller.pageInvUrlUsed}`});
      let vehCardsUsed = await getCardsFromDealer(page, worker, seller, false);
      cards.scraped.vehNumTotalUsed = vehCardsUsed.vehCardArr.length;
      cards.scraped.vehNumPerPageUsed = vehCardsUsed.vehCardsPerPageArr;
      cards.vehCardUrlArr = vehCardsUsed.vehCardArr;

      if (seller.pageInvUrlNew) {
        log({file, func:'getCards', worker, message:`SCRAPING NEW CARDS ON: ${seller.pageInvUrlNew}`});
        let vehCardsNew = await getCardsFromDealer(page, worker, seller, true);
        cards.scraped.vehNumTotalNew = vehCardsNew.vehCardArr.length;
        cards.scraped.vehNumPerPageNew = vehCardsNew.vehCardsPerPageArr;
        cards.vehCardUrlArr.push.apply(cards.vehCardUrlArr, vehCardsNew.vehCardArr);
      }
      cards.scraped.vehNumTotal = cards.scraped.vehNumTotalNew + cards.scraped.vehNumTotalUsed;
    } catch (e) {
      log({file, func:'getCards', worker, message:'ERROR WHILE SCRAPING', error:e});
      cards.scraped.scrapeErr = { errMessage: e.message };
      cards.scraped.scrapeOutcome = 'FAIL';
    }finally {
      log({file, func:'getCards', worker, message:`SCRAPING CARDS END | Total cards found: ${cards.vehCardUrlArr.length}`});
      await postAPI(`https://as-webs-api.azurewebsites.net/vehicle/insert`, JSON.stringify(cards));
    }
  }
}