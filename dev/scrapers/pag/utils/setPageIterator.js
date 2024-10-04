import log from '../../../utils/logger/logger.js';

const file = 'setPageIterator.js';
const func = 'setPageIterator';

export const setPageIterator = async (worker, pagObj) => {
  log({file, func, worker, message:'START'});
  let pageIterator;
  try {
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
    log({file, func, worker, message:'SUCCESS | Exiting setPageIterator', obj:pageIterator});
  } catch (error) {
    await log({level:'error', file, func, worker, message:'FAIL | Exiting setPageIterator', error});
  } finally {
    return pageIterator;
  }
}