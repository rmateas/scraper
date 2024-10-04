import log from '../../../utils/logger/logger.js';
import { getCardsFromDealer } from '../../cards/utils/getVehCards.js';

const file = 'findBestPaginationOption.js';
const func = 'findBestPaginationOption';

export const findBestPaginationOption = async (page, worker, inventoryUrlArray) => {
  log({file, func, worker, message:'START'});
  let findBestPagOptionFlow = {
    allPagOptions:[],
    bestPagOption:null
  };
  let tempArr = [];
  try {
    for(let url of inventoryUrlArray){
      let getPagination = {
        url,
        cardsUrls: [],
        cardsNum: 0
      }
      let foundCards = await getCardsFromDealer(page, worker, url);
      getPagination.cardsUrls = foundCards.vehCardArr;
      getPagination.cardsNum = foundCards.vehCardsPerPageArr;
      tempArr.push(getPagination);
    }
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | EXITING setPag', error});
  } finally {
    let bestPagOption = tempArr.find(elm => elm.cardsNum == Math.max(...tempArr.map(el => el.cardsNum)));
    log({file, func, worker, message:'SUCCESS | EXITING setPag', obj:[bestPagOption]});
    return findBestPagOptionFlow;
  }
}