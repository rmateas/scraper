import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { getAllCardsFromDealer } from './utils/getVehCards.js';

export const getCards = async (page) => {

  for(let sellerData of await getAPI('https://as-webs-api.azurewebsites.net/seller/getprod')){
    let seller = sellerData[0];
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
      console.log('SCRAPING USED CARDS ON:', seller.sellerPageInvUrlUsed);
      let vehCardsUsed = await getAllCardsFromDealer(page, seller, false);
      cards.scraped.vehNumTotalUsed = vehCardsUsed.vehCardArr.length;
      cards.scraped.vehNumPerPageUsed = vehCardsUsed.vehCardsPerPageArr;
      cards.vehCardUrlArr = vehCardsUsed.vehCardArr;

      if (seller.pageInvUrlNew) {
        console.log('SCRAPING NEW CARDS ON:', seller.sellerPageInvUrlNew);
        let vehCardsNew = await getAllCardsFromDealer(page, seller, true);
        cards.scraped.vehNumTotalNew = vehCardsNew.vehCardArr.length;
        cards.scraped.vehNumPerPageNew = vehCardsNew.vehCardsPerPageArr;
        cards.vehCardUrlArr.push.apply(cards.vehCardUrlArr, vehCardsNew.vehCardArr);
      }
      cards.scraped.vehNumTotal = cards.scraped.vehNumTotalNew + cards.scraped.vehNumTotalUsed;
    } catch (e) {
      cards.scraped.scrapeErr = { errMessage: e.message };
      cards.scraped.scrapeOutcome = 'FAIL';
    }finally {
      console.log('SCRAPING CARDS END | Total cards found: ', cards.vehCardUrlArr.length);
      await postAPI(`https://as-webs-api.azurewebsites.net/vehicle/insert`, JSON.stringify(cards));
    }
  }
}