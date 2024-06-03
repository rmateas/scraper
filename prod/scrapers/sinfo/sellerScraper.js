//Look into setUserAgent on page object for pages that error with 429 ('too many requests')

//Dealer Inspire|DealerOn|template1

const fs = require('fs');
const path = require('path');

const { setTimeout } = require('node:timers/promises');

const { log, devLog } = require("../sharedSnips/template/logger.js");
const pageNav = require("../sharedSnips/template/navigation.js");
const getPagination = require("../sharedSnips/commonSnips/getPag.js");
const getVehicleCards = require("../sharedSnips/commonSnips/getVehCards.js");

let scraper = async (worker, page, qp, proxy) => {
  devLog(worker, 'sellerScraper.js', 'scraper', 'Start');
  //STEP THROUGH FUNC FOR DEV
  // const readline = require("readline");
  // let goNext = async (query) => {
  //   const rl = readline.createInterface({
  //     input: process.stdin,
  //     output: process.stdout,
  //   });
  //   return new Promise((resolve) =>
  //     rl.question(query, (ans) => {
  //       rl.close();
  //       resolve(ans);
  //     });
  //   );
  // };
  let vehicleCardUrlArr = [];
  let getSellerAPI, seller, reqUrl;

  if(process.env.NODE_ENV == 'dev'){
    let skipDays = (days) => new Date((new Date() - (days * 86400000)));
    let selectedFields = 'sellerInfo,pageInvUrlNew';
    let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}&select=-scrape`;
    if (qp.url){
      reqUrl = `${apiUrl}&sellerUrl=${qp.url}`;
    } else if(qp.template) {
      reqUrl = `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}`;
    } else {
      reqUrl = `${apiUrl}&sellerUrl[exists]=true&or[sellerTemplate]=dealerOn&or[sellerTemplate]=template1&or[sellerTemplate]=dealerInspire&or[sellerTemplate]=template3` + (qp.days ? `&scrape[scrapeDate][lte]=${skipDays(qp.days)}` : '');
    }
  } else {
    reqUrl = `${qp.host}/seller/getprod`;
  }
  
  devLog(worker, 'sellerScraper.js', 'scraper', 'Request URL', {reqUrl});

  let makeRequest = async () => {
    try {
      return (await fetch(reqUrl)).json();
    } catch (e) {
      await setTimeout(Math.random * 5000);
      await makeRequest();
    }
  }

  let dbInsert = async (sellerInfo, urls) => {
    try {
      let apiRes = await fetch(`${qp.host}/vehicle/insert`, {
        method:'POST',
        body:JSON.stringify({sellerInfo, urls}),
        headers:{
          'Content-type': 'application/json; charset=UTF-8'
        }
      });

      log(worker, 'vehicleScraper.js', 'scraper', `API insert response: ${apiRes.status}`);
    } catch (e) {
      devLog(worker, 'vehicleScraper.js', 'scraper', 'FAIL | API ERROR | API insert', e);
      await dbInsert(sellerInfo, urls);
    }
  }

  try {
    devLog(worker, 'sellerScraper.js', 'scraper', 'Making fetch request');
    getSellerAPI = await makeRequest();
  } catch (e) {
    log(worker, 'sellerScraper.js', 'scraper', 'FAIL | API ERROR | Error fetching from API', e);
    throw new Error('FAIL | API ERROR | Error fetching from API');
  }
  if(getSellerAPI.status != 'success') {
    devLog(worker, 'sellerScraper.js', 'scraper', 'FAIL | API ERROR | API returned with error status', getSellerAPI.message);
    throw new Error('FAIL | API ERROR | API returned with error status');
  }

  seller = getSellerAPI.data[0];
  seller.scraped = {};
  try {
    log(worker, 'sellerScraper.js', 'scraper', `Current url: ${seller.sellerUrl}`);
    //Block requests from these domanins to speed up page load and reduce tracking abilities
    // const blocked_domains = [
    //   'googlesyndication.com',
    //   'adservice.google.com',
    // ];
    
    // await page.setRequestInterception(true);
    // page.on('request', request => {
    //   const url = request.url()
    //   if (blocked_domains.some(domain => url.includes(domain))) {
    //     request.abort();
    //   } else {
    //     request.continue();
    //   }
    // });



    if ((seller.pageInvUrlNew || seller.pageInvUrlUsed) && seller.pageIterator && seller.pageStartIndex) {
      //Get new vehicle cards
      if (seller.pageInvUrlNew) {
        devLog(worker, 'sellerScraper.js', 'scraper', `Getting New Veh Cards`);
        let vehCardsNew = await getVehicleCards(page, worker, seller, true);
        seller.scraped.vehNumTotalNew = vehCardsNew.vehCardArr.length;
        seller.scraped.vehNumPerPageNew = vehCardsNew.vehCardsPerPageArr;
        vehicleCardUrlArr.push.apply(vehicleCardUrlArr, vehCardsNew.vehCardArr);
        devLog(worker, 'sellerScraper.js', 'scraper', `New Veh Cards Found: ${seller.scraped.vehNumTotalNew}`);
      }
    
      //Get used vehicle cards
      if (seller.pageInvUrlUsed) {
        devLog(worker, 'sellerScraper.js', 'scraper', `Getting Used Veh Cards`);
        let vehCardsUsed = await getVehicleCards(page, worker, seller, false);
        seller.scraped.vehNumTotalUsed = vehCardsUsed.vehCardArr.length;
        seller.scraped.vehNumPerPageUsed = vehCardsUsed.vehCardsPerPageArr;
        vehicleCardUrlArr.push.apply(vehicleCardUrlArr, vehCardsUsed);
        devLog(worker, 'sellerScraper.js', 'scraper', `Used Veh Cards Found ${seller.scraped.vehNumTotalUsed}`);
      }
    } else {
      //FIND PAGINATION NAVIGATION
      devLog(worker, 'sellerScraper.js', 'scraper', `Seller Pagination not defined`);
      await pageNav(page, worker, `${seller.sellerUrl}`);
      let paginationInfo = await getPagination(page, worker, seller);
      vehicleCardUrlArr.push.apply(vehicleCardUrlArr, paginationInfo.cards);
      seller.pageInvUrlNew = paginationInfo.newInvUrl;
      seller.pageInvUrlUsed = paginationInfo.usedInvUrl;
      seller.pageStartIndex = paginationInfo.startIndex;
      seller.pageIterator = paginationInfo.iterator;
      seller.scraped.vehNumTotalNew = paginationInfo.vehNumTotalNew;
      seller.scraped.vehNumPerPageNew = paginationInfo.vehNumPerPageNewArr;
      seller.scraped.vehNumTotalUsed = paginationInfo.vehNumTotalUsed;
      seller.scraped.vehNumPerPageUsed = paginationInfo.vehNumPerPageUsedArr;
      devLog(worker, 'sellerScraper.js', 'scraper', `Seller Pagination Set`);
    }
    seller.scraped.vehNumTotal = vehicleCardUrlArr.length;
    
    if (!vehicleCardUrlArr.length) {
      throw new Error('FAIL : No Cards Scraped');
    }
    
    seller.scraped.scrapeOutcome = 'SUCCESS';
  } catch (e) {
    seller.scraped.scrapeErr = { errMessage: e.message, proxy };
    seller.scraped.scrapeOutcome = 'FAIL';
    log(worker, 'sellerScraper.js', 'scraper', `${seller.sellerUrl}`, e);
  } finally {
    seller.scraped.scrapeDate = new Date();
    vehicleCardUrlArr = [...new Set(vehicleCardUrlArr)];
    log(worker, 'sellerScraper.js', 'scraper', `Total Cards Scraped ${vehicleCardUrlArr.length}`);
    log(worker, 'sellerScraper.js', 'scraper', `${seller.scraped.scrapeOutcome} | Scraped Seller Object`, seller);

    await dbInsert(seller, vehicleCardUrlArr);

    return;
  }
};

module.exports = scraper;