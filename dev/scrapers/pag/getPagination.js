/**
 * Function Calls Order by File
 * 
 * getPossibleInventoryUrls -> 
 * findAllPaginationUrls -> 
 * findBestPaginationOption -> 
 * setPageIterator ->
 * setPageStartIndex  
 */




import { log } from '../../utils/logger/logger.js';
import { pageNav } from '../../utils/navigation.js';
import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { findPossiblePagination } from './utils/findPossiblePagination.js';
import { findBestPaginationOption } from './utils/findBestPaginationOption.js';
import { getPossibleInventoryUrls } from './utils/getPossibleInventoryUrls.js';


/**
 * FLOW OF THIS SCRAPER:
 * 
 * Get all possible inventory URLs -> 
 * Go through possible inventory URLs and see if there are any pagination options -> 
 * Go through pagination options to see which URLs hold the most cards -> 
 * Set pagination URLs for new and used as well as a start index and and iterator if available
 *  
 */
export const getPagination = async (page, worker) => {
  const file = 'getPagination.js';
  const func = 'getPagination';
  log({file, func, worker, message:'START'});
  
  // let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}`;
  // let reqUrl = qp.url ? `${apiUrl}&sellerUrl=${qp.url}` :
  //   qp.template ? `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}` :
  //   `${apiUrl}&sellerUrl[exists]=true`;

  let seller = (await getAPI(worker, `${process.env.HOST}/seller/getpag`))[0];

  let paginationInfo = {
    sellerId:seller.sellerId,
    sellerTemplate:seller.sellerTemplate,
    pageInvUrlNew: undefined,
    pageInvUrlUsed: undefined,
    pageStartIndex: undefined,
    pageIterator: undefined,
    cards: [],
    scraped:{
      scrapeDate:new Date(),
      scrapeOutcome:'SUCCESS',
      vehNumTotal: 0,
      vehNumTotalNew: 0,
      vehNumPerPageNew: [],
      vehNumTotalUsed: 0,
      vehNumPerPageUsed: [],
      possibleInventoryUrls: [],
      paginationFlow: [],
      paginationErr: []
    }
  };

  try {
    let getPaginationNav1 = await pageNav(page, worker, seller.sellerUrl);
    if(getPaginationNav1 != true){
      paginationInfo.scraped.paginationErr.push(getPaginationNav1.message);
      throw new Error(getPaginationNav1.message);
    }

    let possibleInventoryUrls = await getPossibleInventoryUrls(page, worker);
    paginationInfo.scraped.possibleInventoryUrls = possibleInventoryUrls.allInvUrls;
    if(!possibleInventoryUrls.new.length || !possibleInventoryUrls.used.length){
      paginationInfo.scraped.paginationErr.push('No Inventory URLs Found');
      throw new Error('No Inventory URLs Found');
    }

    let getBestPaginationOption = async (invUrl) => {
      let { possiblePaginationUrls, cards, findPossiblePaginationFlow } = await findPossiblePagination(page, worker, seller.sellerUrl, invUrl);
      paginationInfo.paginationFlow.push(findPossiblePaginationFlow);
      if(!possiblePaginationUrls.length){return;}
      cards.length && paginationInfo.cards.push.apply(paginationInfo.cards, cards);
      return await findBestPaginationOption(page, worker, possiblePaginationUrls);
    }

    // FIND POSSIBLE PAGINATION NEW 
    let getNewInvUrl = possibleInventoryUrls.new.length && await getBestPaginationOption(possibleInventoryUrls.new);

    // FIND POSSIBLE PAGINATION USED
    let getUsedInvUrl;
    if(possibleInventoryUrls.used.length){
      for(let i = 0; i < possibleInventoryUrls.length;){
        /all/i.test(possibleInventoryUrls.used[i]) ? /(?=.*all)(?=.*used)/.test(possibleInventoryUrls.used[i]) ? i++ : possibleInventoryUrls.used.splice(i, 1) : i++;
      }
      getUsedInvUrl = await getBestPaginationOption(possibleInventoryUrls.used);
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

    paginationInfo.pageInvUrlNew = getNewInvUrl?.url;
    paginationInfo.pageInvUrlUsed = getUsedInvUrl?.url;
    paginationInfo.pageStartIndex = setInfo('startIndex');
    paginationInfo.pageIterator = setInfo('iterator');

    paginationInfo.cards = [...new Set(paginationInfo.cards)];
  } catch (error) {
    paginationInfo.scraped.scrapeErr = { errMessage: error.message };
    paginationInfo.scraped.scrapeOutcome = 'FAIL';
    await log({level:'error', file, func, worker, message:`FAIL | ERROR FINDING PAGINATION FOR ${seller.sellerUrl}`, error});
  }finally {
    await postAPI(worker, `${process.env.HOST}/seller/updatepag`, JSON.stringify(paginationInfo));
  }
}