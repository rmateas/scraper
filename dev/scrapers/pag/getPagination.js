import { log } from '../../utils/logger/logger.js';
import { pageNav } from '../../utils/navigation.js';
import { getAPI, postAPI } from '../../utils/apiUtils.js';
import { findPossiblePagination } from './utils/findPossiblePagination.js';
import { findBestPaginationOption } from './utils/findBestPaginationOption.js';
import { getPossibleInventoryUrls } from './utils/getPossibleInventoryUrls.js';

const file = 'getPagination.js';
const func = 'getPagination';

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
  log({file, func, worker, message:'START'});

  
  // let apiUrl = `${qp.host}/seller/get?limit=${qp.limit}&skip=${qp.skip}`;
  // let reqUrl = qp.url ? `${apiUrl}&sellerUrl=${qp.url}` :
  //   qp.template ? `${apiUrl}&sellerUrl[exists]=true&sellerTemplate=${qp.template}` :
  //   `${apiUrl}&sellerUrl[exists]=true`;

  let seller = (await getAPI(worker, 'https://as-webs-api.azurewebsites.net/seller/get?limit=10&skip=0&sellerUrl[exists]=true&select=-scrape'))[0];

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
    }
  };

  try {
    await pageNav(page, worker, seller.sellerUrl);
    let possibleInventoryUrls = await getPossibleInventoryUrls(page, worker);

    let getBestPaginationOption = async (invUrl) => {
      let { possiblePaginationUrls, cards } = await findPossiblePagination(worker, invUrl);
      if(!possiblePaginationUrls.length){return;}
      cards.length && paginationInfo.cards.push.apply(paginationInfo.cards, cards);
      return await findBestPaginationOption(page, worker, possiblePaginationUrls);
    }

    // FIND POSSIBLE PAGINATION NEW 
    let getNewInvUrl = possibleInventoryUrls.new.length && await getBestPaginationOption(possibleInventoryUrls.new);

    // FIND POSSIBLE PAGINATION USED
    let getUsedInvUrl = (async () => {
      if(possibleInventoryUrls.used.length){
        for(let i = 0; i < possibleInventoryUrls.length;){
          /all/i.test(possibleInventoryUrls.used[i]) ? /(?=.*all)(?=.*used)/.test(possibleInventoryUrls.used[i]) ? i++ : possibleInventoryUrls.used.splice(i, 1) : i++;
        }
        return await getBestPaginationOption(possibleInventoryUrls.used);
      }
    })()

    let setInfo = (prop) => {
      if(getNewInvUrl && getNewInvUrl[prop]){
        if(getUsedInvUrl && getUsedInvUrl[prop]){
          if(getNewInvUrl[prop] == getUsedInvUrl[prop]){
            return getUsedInvUrl[prop];
          }
          // ADD WRITE TO DB TO TRACK THAT THERE IS AN INCONSISTENCY BETWEEN NEW AND USED
          return getUsedInvUrl[prop];
        }
          // ADD WRITE TO DB TO TRACK THAT HTERE IS NO USED PROP AVAILABLE
          return getNewInvUrl[prop];
      } else if(getUsedInvUrl && getUsedInvUrl[prop]) {
        return getUsedInvUrl[prop];
      }
      // WRITE TO DB THAT THERE WAS NO SUCCESS
    }

    paginationInfo.pageInvUrlNew = getNewInvUrl?.url;
    paginationInfo.pageInvUrlUsed = getUsedInvUrl?.url;
    paginationInfo.pageStartIndex = setInfo('startIndex');
    paginationInfo.pageIterator = setInfo('iterator');

    invUrls.cards = [...new Set(invUrls.cards)];
  } catch (error) {
    paginationInfo.scraped.scrapeErr = { errMessage: error.message };
    paginationInfo.scraped.scrapeOutcome = 'FAIL';
    log({level:'error', file, func, worker, message:`FAIL | ERROR FINDING PAGINATION FOR ${seller.sellerUrl}`, error});
  }finally {
    await postAPI(worker, `${qp.host}/seller/updatepag`, JSON.stringify(paginationInfo));
  }
}