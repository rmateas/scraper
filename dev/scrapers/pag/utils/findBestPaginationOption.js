import { log } from '../../../utils/logger/logger.js';
import { getCardsFromDealer } from '../../cards/utils/getVehCards.js';

const file = 'findBestPaginationOption.js';
const func = 'findBestPaginationOption';

export const findBestPaginationOption = async (page, worker, inventoryUrlArray) => {
  log({file, func, worker, message:'START'});
  let findBestPagOptionFlow = {
    allPagOptions:[],
    bestPagOption:null
  };
  try {
    for(let i = 0; i < inventoryUrlArray.length; i++){
      let getPagination = {
        url: inventoryUrlArray[i],
        cards,
      };
      let foundCards = await getCardsFromDealer(page, worker, inventoryUrlArray[i]);
      inventoryUrlArray[i].cards = getPagination.cards.vehCardArr;
      inventoryUrlArray[i].cardsPerPageArr = foundCards.vehCardsPerPageArr;
    }
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | EXITING setPag', error});
  } finally {
    let bestPagOption = inventoryUrlArray.find(elm => elm.cards.length == Math.max(...inventoryUrlArray.map(el => el.cards.length)));
    log({file, func, worker, message:'SUCCESS | EXITING setPag', obj:[bestPagOption]});
    return [bestPagOption, allPagOptions];
  }
}