import { log } from '../../../utils/logger/logger.js';
import { getCardsFromDealer } from '../../cards/utils/getVehCards.js';

const file = 'findBestPaginationOption.js';
const func = 'findBestPaginationOption';

export const findBestPaginationOption = async (page, worker, inventoryUrlArray) => {
  log({file, func, worker, message:'START'});
  try {
    for(let i = 0; i < inventoryUrlArray.length; i++){
      let foundCards = await getCardsFromDealer(page, worker, inventoryUrlArray[i]);
      inventoryUrlArray[i].cards = foundCards.vehCardArr;
      inventoryUrlArray[i].cardsPerPageArr = foundCards.vehCardsPerPageArr;
    }
    let bestPagOption = inventoryUrlArray.find(elm => elm.cards.length == Math.max(...inventoryUrlArray.map(el => el.cards.length)));
    log({file, func, worker, message:'SUCCESS | EXITING setPag', obj:[bestPagOption]});
    return [bestPagOption];
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | EXITING setPag', error});
  }
}