import { log } from '../../../utils/logger/logger.js';

const file = 'setPageIterator.js';

export const setPageIterator = async (worker, pagObj) => {
  log({file, func:'setPageIterator', worker, message:'START'});
  try {
    let pageIterator;
    if(pagObj.iterators.length > 1){
      let pageIteratorCount = [];
      let countDiff;
      let exists;
      for(let i = 0; i < pagObj.iterators.length - 1; i++){
        countDiff = pagObj.iterators[i+1] - pagObj.iterators[i];
        exists = pageIteratorCount.find(el => el.num === countDiff && el.count++);
        !exists && pageIteratorCount.push({num:countDiff, count:1});
      }
      pageIterator = pageIteratorCount.find(el => el.count == Math.max(...pageIteratorCount.map(o => o.count))).num;
    } else {
      pageIterator = pagObj.iterators[0] > 2 ? pagObj.iterators[0] : 1;
    }
    log({file, func:'setPageIterator', worker, message:'SUCCESS | Exiting setPageIterator', obj:pageIterator});
    return pageIterator;
  } catch (e) {
    log({file, func:'setPageIterator', worker, message:'FAIL | Exiting setPageIterator', error:e});
  }
}