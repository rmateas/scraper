const fs = require('fs');
const path = require('path');

const { setTimeout } = require('node:timers/promises');

const { log, devLog } = require("../sharedSnips/template/logger.js");
const { getAPI, postAPI } = require('../../utils/apiUtils.js');
const pageNav = require("../sharedSnips/template/navigation.js");
const comTemp = require("./utils/getSellerInfo.js");

module.exports = async (worker, page, qp) => {

  let selectedFields = '&select=sellerUrl,sellerId,sellerTemplate';
  let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}${selectedFields}`;
  let reqUrl = qp.url ? `${apiUrl}&sellerUrl=${qp.url}` :
    qp.template ? `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}` :
    `${apiUrl}&sellerUrl[exists]=true`;

  let APIData = await getAPI(worker, reqUrl);

  for(let seller of APIData){
    devLog(worker, 'getSellerInfo.js', 'getSellerInfo', `Getting seller info`);
    let sellerInfo = {
      sellerId:seller.sellerId,
      scraped:{
        scrapeDate:new Date(),
        scrapeOutcome:'SUCCESS'
      }
    };
    try {
      devLog(worker, 'getSellerInfo.js', 'getSellerInfo', 'Setting seller info');
      await pageNav(page, worker, seller.sellerUrl);
      await page.addScriptTag({path: './sharedSnips/template/browserFunctions.js'});
      let getSellerInfo = fs.existsSync(path.join(__dirname, `../${seller.sellerTemplate}/getSellerInfo.js`)) ?
      require(`../${seller.sellerTemplate}/getSellerInfo.js`) : comTemp;
      sellerInfo.info = await getSellerInfo(page, worker);
      devLog(worker, 'getSellerInfo.js', 'getSellerInfo', `Seller info set`);
    } catch (e) {
      sellerInfo.scraped.scrapeErr = { errMessage: e.message };
      sellerInfo.scraped.scrapeOutcome = 'FAIL';
      log(worker, 'getSellerInfo.js', 'getSellerInfo', `${seller.sellerUrl}`, e);
    } finally {
      await postAPI(worker, `${qp.host}/seller/updateinfo`, JSON.stringify(sellerInfo));
    }
  }
}