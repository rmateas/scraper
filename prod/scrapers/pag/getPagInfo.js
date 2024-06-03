const { setTimeout } = require('node:timers/promises');

const { log, devLog } = require("../sharedSnips/template/logger.js");
const { getAPI, postAPI } = require('../utils/apiUtils.js');
const pageNav = require("../sharedSnips/template/navigation.js");
const getPagination = require("../scrapers/pag/getPag.js");

module.exports = async (worker, page, qp) => {

  let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}`;
  let reqUrl = qp.url ? `${apiUrl}&sellerUrl=${qp.url}` :
    qp.template ? `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}` :
    `${apiUrl}&sellerUrl[exists]=true`;

  let APIData = await getAPI(worker, reqUrl);

  for(let seller of APIData){
    devLog(worker, 'getVehCards.js', 'getSellerInfo', `Getting seller info`);
    let sellerInfo = {
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
      devLog(worker, 'getVehCards.js', 'getVehCards', `Seller Pagination not defined`);
      await pageNav(page, worker, `${seller.sellerUrl}`);
      let pagInfo = await getPagination(page, worker, seller);
      sellerInfo.pageInvUrlNew = pagInfo.newInvUrl;
      sellerInfo.pageInvUrlUsed = pagInfo.usedInvUrl;
      sellerInfo.pageStartIndex = pagInfo.startIndex;
      sellerInfo.pageIterator = pagInfo.iterator;
      sellerInfo.vehCardUrlArr = pagInfo.cards;
      sellerInfo.scraped.vehNumTotalNew = pagInfo.vehNumTotalNew;
      sellerInfo.scraped.vehNumPerPageNew = pagInfo.vehNumPerPageNewArr;
      sellerInfo.scraped.vehNumTotalUsed = pagInfo.vehNumTotalUsed;
      sellerInfo.scraped.vehNumPerPageUsed = pagInfo.vehNumPerPageUsedArr;
      sellerInfo.scraped.vehNumTotal = sellerInfo.scraped.vehNumTotalNew + sellerInfo.scraped.vehNumTotalUsed;
      devLog(worker, 'getVehCards.js', 'getVehCards', `Seller Pagination Set`, sellerInfo);
    } catch (e) {
      sellerInfo.scraped.scrapeErr = { errMessage: e.message };
      sellerInfo.scraped.scrapeOutcome = 'FAIL';
      log(worker, 'getVehCards.js', 'getSellerInfo', `${seller.sellerUrl}`, e);
    }finally {
      await postAPI(worker, `${qp.host}/seller/updatepag`, JSON.stringify(sellerInfo));
    }
  }
}