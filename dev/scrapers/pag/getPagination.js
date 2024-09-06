/**
 * Wire Frame
 * 
 * STEP 1:
 * Navigate to home URL
 * Grab all URLs on page
 * Sort URLs for invertory specific ones
 * RETURN [Array of possible inventory URLs]
 * 
 * STEP 2
 * [Array of possible inventory URLs]
 * Navigate to URL
 * Grab all URLs
 * Test for possible vehicle cards
 * - If true: next step, else: continue array
 * Test for pagination URLs 
 * - If true: next step, else: continue array
 * Look for pattern in pagination URLs to try to get start index and page iterator
 * - If possible get cards per page limiter
 * RETURN [Array of URLs where pagination URLs exist]
 * 
 * STEP 3:
 * [Array of URLs where pagination URLs exist]
 * // Sometimes gives false positive for chain dealerships, default for these is to get all cards in the area rather than just cards for the dealership. These have a dealer ID that has to be set as well, often zipcode or city name.
 * Test URL to see which one returns the most cards
 * RETURN {
 *    sellerUrl,
 *    startIndex,
 *    pageIterator,
 *    dealerLocationID(optional),
 *    vehicleCards
 * }
 * 
 * STEP 4 (optional):
 * Check new and used URLs and their properties against one another to make sure things match between the two
 * 
 * STEP 5: 
 * Push to DB
 *  
 */

/**
 * Function Calls Order by File
 * 
 * getPossibleInventoryUrls -> 
 * findAllPaginationUrls -> 
 * findBestPaginationOption -> 
 * setPageIterator ->
 * setPageStartIndex  
 */

import { chromium } from 'playwright';

import { log } from '../../utils/logger/logger.js';
import { pageNav } from '../../utils/navigation.js';
import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { findPossiblePagination } from './utils/findPossiblePagination.js';
import { findBestPaginationOption } from './utils/findBestPaginationOption.js';
import { getPossibleInventoryUrls } from './utils/getPossibleInventoryUrls.js';

export const getPagination = async (wsEndpoint, worker, proxy) => {
  const file = 'getPagination.js';
  const func = 'getPagination';
  log({file, func, worker, message:'START'});
  
  let page;

  // let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}`;
  // let reqUrl = qp.url ? `${apiUrl}&sellerUrl=${qp.url}` :
  //   qp.template ? `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}` :
  //   `${apiUrl}&sellerUrl[exists]=true`;

  let seller = (await getAPI(worker, `${process.env.HOST}/seller/getpag`))[0];

  let pagInfo = {
    sellerId:seller.sellerId,
    sellerTemplate:seller.sellerTemplate,
    pageInvUrlNew: undefined,
    pageInvUrlUsed: undefined,
    pageStartIndex: undefined,
    pageIterator: undefined,
    residentialProxy: false,
    cards: [],
    scrape:{
      scrapeDate:new Date(),
      scrapeOutcome:'SUCCESS',
      vehNumTotal: 0,
      vehNumTotalNew: 0,
      vehNumPerPageNew: [],
      vehNumTotalUsed: 0,
      vehNumPerPageUsed: [],
      possibleInvUrls:{
        allUrls: [],
        newUrls: [],
        usedUrls: []
      },
      paginationFlow: [],
      allPaginationOptions: [],
      bestPaginationOption: {},
      scrapeErrors: [],
      proxy
    }
  };

  try {
    //Connect to browser and create page
    try {
      let browserConnect = await chromium.connect(wsEndpoint);
      let context = await browserConnect.newContext();
      page = await context.newPage();
    } catch (error) {
      //Set special exit code for when connecting to browser fails so that the browser can be tested
      //503 proxy error
      process.exit(503);
    }

    try {
      let getPaginationNav1 = await pageNav(page, worker, seller.sellerUrl);
      if(getPaginationNav1.status != true){
        pagInfo.scrape.scrapeErrors.push(getPaginationNav1);
        throw {level:'fatal', file, func, worker, type:'NAV', message:getPaginationNav1.message};
      }

      let getPossibleInventoryUrlsError;
      ({allUrls:pagInfo.scrape.possibleInvUrls.allUrls, newUrls:pagInfo.scrape.possibleInvUrls.newUrls, usedUrls:pagInfo.scrape.possibleInvUrls.usedUrls, error:getPossibleInventoryUrlsError} = await getPossibleInventoryUrls(page, worker));
      getPossibleInventoryUrlsError != null && pagInfo.scrape.scrapeErrors.push(getPossibleInventoryUrlsError);
      if(!pagInfo.scrape.possibleInvUrls.newUrls.length && !pagInfo.scrape.possibleInvUrls.usedUrls.length){
        throw {level:'fatal', file, func, worker, type:'CONTENT', message:'No Inventory URLs Found'};
      }

      let getBestPaginationOption = async (invUrlsArr) => {
        let { possiblePaginationUrls, cards, findPossiblePaginationFlow } = await findPossiblePagination(page, worker, seller.sellerUrl, invUrlsArr);
        pagInfo.scrape.paginationFlow.push(findPossiblePaginationFlow);
        if(!possiblePaginationUrls.length){return;}
        cards.length && pagInfo.cards.push.apply(pagInfo.cards, cards);
        let bestPaginationOption = await findBestPaginationOption(page, worker, possiblePaginationUrls);
        pagInfo.scrape.bestPaginationOption = bestPaginationOption.bestPagOption;
        pagInfo.scrape.allPaginationOptions = bestPaginationOption.allPagOptions;
        return bestPaginationOption.bestPagOption;
      }

      // FIND POSSIBLE PAGINATION NEW 
      let getNewInvUrl = pagInfo.scrape.possibleInvUrls.newUrls.length && await getBestPaginationOption(pagInfo.scrape.possibleInvUrls.newUrls);

      // FIND POSSIBLE PAGINATION USED
      let getUsedInvUrl;
      if(pagInfo.scrape.possibleInvUrls.usedUrls.length){
        for(let i = 0; i < pagInfo.scrape.possibleInvUrls.usedUrls.length;){
          /all/i.test(pagInfo.scrape.possibleInvUrls.usedUrls[i]) ? /(?=.*all)(?=.*used)/.test(pagInfo.scrape.possibleInvUrls.usedUrls[i]) ? i++ : pagInfo.scrape.possibleInvUrls.usedUrls.splice(i, 1) : i++;
        }
        getUsedInvUrl = await getBestPaginationOption(pagInfo.scrape.possibleInvUrls.usedUrls);
      }

      let setInfo = (prop) => {
        if(getNewInvUrl && getNewInvUrl[prop]){
          if(getUsedInvUrl && getUsedInvUrl[prop]){
            if(getNewInvUrl[prop] == getUsedInvUrl[prop]){
              return getUsedInvUrl[prop];
            }
            // ADD WRITE TO DB TO TRACK THAT THERE IS AN INCONSISTENCY BETWEEN NEW AND USED
            return getUsedInvUrl[prop];
          }
            // ADD WRITE TO DB TO TRACK THAT THERE IS NO USED PROP AVAILABLE
            return getNewInvUrl[prop];
        } else if(getUsedInvUrl && getUsedInvUrl[prop]) {
          return getUsedInvUrl[prop];
        }
        // WRITE TO DB THAT THERE WAS NO SUCCESS IN FINDING AND SETTING PAGINATION
      }

      pagInfo.pageInvUrlNew = getNewInvUrl?.url;
      pagInfo.pageInvUrlUsed = getUsedInvUrl?.url;
      pagInfo.pageStartIndex = setInfo('startIndex');
      pagInfo.pageIterator = setInfo('iterator');

      pagInfo.cards = [...new Set(pagInfo.cards)];
    } catch (error) {
      pagInfo.scrape.scrapeErrors.push({level:'error', file, func, worker, message:`FAIL | ERROR FINDING PAGINATION FOR ${seller.sellerUrl}`, error});
      pagInfo.scrape.scrapeOutcome = 'FAIL';
      await log({level:'error', file, func, worker, message:`FAIL | ERROR FINDING PAGINATION FOR ${seller.sellerUrl}`, error});
    }finally {
      log({file, func, worker, message:'Completed pagination info', pagInfo});
      await postAPI(worker, `${process.env.HOST}/seller/updatepag`, JSON.stringify(pagInfo));
    }
  } catch (error) {
    //MAIN CATCH
    log({file, func, worker, message:'ERROR WITH SCRAPER', error});
    //******** take screenshot of page and upload to DB */
    await page.screenshot({path: `test${(new Date()).getMinutes()}.png`, fullPage: true});
  }
}