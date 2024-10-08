import { log } from '../../../utils/logger/logger.js';
import { pageNav } from '../../../utils/navigation.js';
import { findAllPaginationUrls } from './findAllPaginationUrls.js'; 
import { setPageIterator } from './setPageIterator.js';
import { setPageStartIndex } from './setPageStartIndex.js';
import { getVehCardUrls } from '../../cards/utils/getVehCardUrls.js';

const file = 'findPossiblePagination.js';
const func = 'findPossiblePagination';
let possiblePaginationUrls = [];
let cards = [];
let findPossiblePaginationFlow = [];

export const findPossiblePagination = async (page, worker, sellerUrl, invUrlArr) => {
  log({file, func, worker, message:'START'});
  try {
    for (let invUrl of invUrlArr) {
      let paginationFlow = {
        url:invUrl,
        allPaginationUrlOptions: [],
        filteredPaginationObjects: [],
        pageIterator: null,
        startIndexFlow: {},
        possibleCards: [],
        caughtErrors: []
      }
      try {
        let findPossiblePaginationNav1 = await pageNav(page, worker, `${sellerUrl}${invUrl}`);
        if(findPossiblePaginationNav1 != true){
          paginationFlow.caughtErrors.push({errorType: 'NAV ERROR', endpoint: `${sellerUrl}${invUrl}`, message: findPossiblePaginationNav1.message});
          findPossiblePaginationFlow.push(paginationFlow);
          continue;
        }
        let {cards:foundCards, error} = await getVehCardUrls(page, worker);
        if(error || !foundCards.length){
          error != null ? paginationFlow.caughtErrors.push(error) : paginationFlow.caughtErrors.push({errorType: 'CONTENT', endpoint: `${sellerUrl}${invUrl}`, message: 'NO CARDS FOUND'});
          findPossiblePaginationFlow.push(paginationFlow);
          continue;
        }
        paginationFlow.possibleCards = foundCards;
        cards.push.apply(cards, foundCards);
        let findAllPaginationUrlsCaughtErrors;
        ({allUrls:paginationFlow.allPaginationUrlOptions, filteredUrls:paginationFlow.filteredPaginationObjects, caughtErrors:findAllPaginationUrlsCaughtErrors} = await findAllPaginationUrls(page, worker));
        if(findAllPaginationUrlsCaughtErrors.length || !paginationFlow.filteredPaginationObjects.length){
          findAllPaginationUrlsCaughtErrors.length ? paginationFlow.caughtErrors.push(...findAllPaginationUrlsCaughtErrors) : paginationFlow.caughtErrors.push({errorType: 'CONTENT', endpoint: `${sellerUrl}${invUrl}`, message: 'NO VIABLE PAGINATION OPTIONS'});
          findPossiblePaginationFlow.push(paginationFlow);
          continue;
        }
        for(let paginationObj of paginationFlow.filteredPaginationObjects){
          paginationFlow.pageIterator = await setPageIterator(worker, paginationObj);
          !paginationFlow.pageIterator && paginationFlow.caughtErrors.push({errorType: 'CONTENT', endpoint: `${sellerUrl}${invUrl}`, message: 'NO ABLE TO SET PAGE ITERATOR'});
          paginationFlow.startIndexFlow = await setPageStartIndex(page, worker, paginationObj); 

          possiblePaginationUrls.push({url: paginationObj.url, pageStartIndex:paginationFlow.startIndexFlow.startIndex, pageIterator:paginationFlow.pageIterator, sellerTemplate:seller.sellerTemplate});
        }
        findPossiblePaginationFlow.push(paginationFlow);
      } catch (error) {
        await log({level:'error', file, func, worker, message:`FAIL | Error finding possible pagination : ${invUrl}`, error});
        paginationFlow.caughtErrors.push({errorType: 'CONTENT', endpoint: `${sellerUrl}${invUrl}`, message: 'ERROR FINDING PAGINATION'});
        findPossiblePaginationFlow.push(paginationFlow);
        continue;
      }
      console.log(paginationFlow);
    }
    cards = [...new Set(cards)];
    console.log(possiblePaginationUrls);
    log({file, func, worker, message:'SUCCESS | Exiting findPossiblePagination', obj:possiblePaginationUrls});
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | Exiting findPossiblePagination', error});
  } finally {
    return {possiblePaginationUrls, cards, findPossiblePaginationFlow};
  }
}