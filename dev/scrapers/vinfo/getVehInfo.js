//Dealer Inspire|DealerOn|template1
const fs = require('fs');
const path = require('path');

const { performance:time } = require('perf_hooks');

const { log, devLog } = require('../sharedSnips/template/logger.js');
const { getAPI, postAPI } = require('./utils/apiUtils.js');
const pageNav = require('../sharedSnips/template/navigation.js');
const comTemp = require('../sharedSnips/scrapers/vehData/getVehInfo.js');

module.exports = async (worker, page, qp, proxy) => {
  devLog(worker, 'getVehInfo.js', 'getVehInfo', 'Start');

  let VehCardInfoArr = [];
  let APIData = await getAPI(worker, `${qp.host}/vehicle/get/${qp.limit}`);
  
  for(let specs of APIData) {
    log(worker, 'getVehInfo.js', 'getVehInfo', `Current url: ${specs.url}`);
    let getVehInfo = fs.existsSync(path.join(__dirname, `../${specs.sellerTemplate}/pageScraper.js`)) ? 
      require(`../${specs.sellerTemplate}/getVehicleInfo.js`) : comTemp;
  
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
    } catch (e) {
      specs.scrapeFail = {errDate: new Date(), errMessage: e.message, errStack: e.stack};
      log(worker, 'getVehInfo.js', 'getVehInfo', `FAIL | Error at ${specs.url}`, e);
    } finally {
      log(worker, 'getVehInfo.js', 'getVehInfo', `Scrape Time : ${(time.now() - time1).toString().split(".")[0]}ms | Vehicle : ${specs.url}`, specs);
      VehCardInfoArr.push(specs);
      let time2 = time.now();
      if((time2 - time1) < 7000){
        await page.waitForTimeout((Math.random()*1000)+ (7000 - (time2 - time1)));
      }
    }
  }
  await postAPI(worker, `${qp.host}/vehicle/update`, JSON.stringify(VehCardInfoArr));
};