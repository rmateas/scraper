import { log } from '../../../utils/logger/logger.js';
import { pageNav } from '../../../utils/navigation.js';
import { findAllPaginationUrls } from './findAllPaginationUrls.js'; 
import { setPageIterator } from './setPageIterator.js';
import { setPageStartIndex } from './setPageStartIndex.js';
import { getVehCardUrls } from '../../cards/utils/getVehCardUrls.js';

const file = 'findPossiblePagination.js';
let possiblePaginationUrls = [];
let cards = [];

export const findPossiblePagination = async (worker, invUrlArr) => {
  log({file, func:'findPossiblePagination', worker, message:'Start'});
  try {
    for (let invUrl of invUrlArr) {
      log({file, func:'findPossiblePagination', worker, message:`Possible Inv Url: ${invUrl}`});
      try {
        await pageNav(page, worker, `${seller.sellerUrl}${invUrl}`);
        let foundCards = await getVehCardUrls(page, worker);
        if(!foundCards.length){continue;}
        cards.push.apply(cards, foundCards);
        for(let paginationObj of await findAllPaginationUrls(page, worker)){
          let pageIterator = await setPageIterator(paginationObj);
          let startIndex = await setPageStartIndex(page, worker, paginationObj);
          if(!pageIterator || !startIndex){continue;}
          possiblePaginationUrls.push({url: paginationObj.url, pageStartIndex:startIndex, pageIterator:pageIterator, sellerTemplate:seller.sellerTemplate});
        }
      } catch (e) {
        log({file, func:'findPossiblePagination', worker, message:`FAIL | Error finding possible pagination : ${invUrl}`, error:e});
        continue;
      }
    }
    cards = [...new Set(cards)];
    log({file, func:'findPossiblePagination', worker, message:'SUCCESS | Exiting findPossiblePagination', obj:possiblePaginationUrls});
  } catch (e) {
    log({file, func:'findPossiblePagination', worker, message:'FAIL | Exiting findPossiblePagination', error:e});
  } finally {
    return {possiblePaginationUrls, cards};
  }
}