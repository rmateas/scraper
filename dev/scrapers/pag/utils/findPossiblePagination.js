import { log } from '../../../utils/logger/logger.js';
import { pageNav } from '../../../utils/navigation.js';
import { findAllPaginationUrls } from './findAllPaginationUrls.js'; 
import { setPageIterator } from './setPageIterator.js';
import { setPageStartIndex } from './setPageStartIndex.js';
import { getVehCardUrls } from '../../cards/utils/getVehCardUrls.js';

const file = 'findPossiblePagination.js';
const func = 'findPossiblePagination';
let findPossiblePaginationFlow = []
let possiblePaginationUrls = [];
let cards = [];

export const findPossiblePagination = async (page, worker, sellerUrl, invUrlArr) => {
  log({file, func, worker, message:'START'});
  try {
    for (let invUrl of invUrlArr) {
      let paginationFlow = {
        url:invUrl,
        possibleCards: [],
        caughtErrors: []
      }
      try {
        let findPossiblePaginationNav1 = await pageNav(page, worker, `${sellerUrl}${invUrl}`);
        if(findPossiblePaginationNav1 != true){
          paginationFlow.caughtErrors.push({errorType: 'NAV ERROR', endpoint: `${sellerUrl}${invUrl}`, message:findPossiblePaginationNav1.message});
          continue;
        }
        let foundCards = await getVehCardUrls(page, worker);
        if(!foundCards.length){continue;}
        paginationFlow.possibleCards = foundCards;
        cards.push.apply(cards, foundCards);
        let allPag = await findAllPaginationUrls(page, worker);
        for(let paginationObj of allPag){
          let pageIterator = await setPageIterator(paginationObj);
          let startIndex = await setPageStartIndex(page, worker, paginationObj);
          if(!pageIterator || !startIndex){continue;}
          possiblePaginationUrls.push({url: paginationObj.url, pageStartIndex:startIndex, pageIterator:pageIterator, sellerTemplate:seller.sellerTemplate});
        }
      } catch (error) {
        await log({level:'error', file, func, worker, message:`FAIL | Error finding possible pagination : ${invUrl}`, error});
        continue;
      }
    }
    cards = [...new Set(cards)];
    log({file, func, worker, message:'SUCCESS | Exiting findPossiblePagination', obj:possiblePaginationUrls});
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | Exiting findPossiblePagination', error});
  } finally {
    return {possiblePaginationUrls, cards};
  }
}