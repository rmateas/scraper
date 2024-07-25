import { log } from '../../../utils/logger/logger.js';

const file = 'setPageStartIndex.js';

export const setPageStartIndex = async (page, worker, pagObj) => {
  log({file, func:'setPageStartIndex', worker, message:'START'});
  let findStartIndex = {
    startIndex,
    page0Cards,
    page1Cards,
    possibleIndex: pagObj.iterators[0] < 3 ? 1 : pagObj.iterator[0],
  }
  try {
    let tempArr = [];
    await pageNav(page, worker, `${pagObj.url.replace(/~~~/, '0')}`);
    let page0Urls = await getVehCardUrls(page, worker);
    if(page0Urls.length && pagObj.iterators[0] == 0){
      findStartIndex.startIndex = 0;
    } else {
      tempArr.push.apply(tempArr, page0Urls);
      await pageNav(page, worker, `${pagObj.url.replace(/~~~/, findStartIndex.possibleIndex)}`);
      let page1Urls = await getVehCardUrls(page, worker);
      if(!page1Urls.length){
        log({level:'error', file, func:'setPageStartIndex', worker, message:'FAIL | Exiting setPageStartIndex: No vehicle cards found to set start index'});
        return findStartIndex;
      }
      tempArr.push.apply(tempArr, page1Urls);
      tempArr = [...new Set(tempArr)];
      findStartIndex.startIndex = page0Urls.length ? tempArr.length == page0Urls.length ? findStartIndex.possibleIndex : 0 : findStartIndex.possibleIndex;
    }
    log({file, func:'setPageStartIndex', worker, message:'SUCCESS | Exiting setPageStartIndex', obj:findStartIndex.startIndex});
  } catch (error) {
    await log({level:'error', file, func:'setPageStartIndex', worker, message:'FAIL | Exiting setPageStartIndex', error});
  } finally {
    return findStartIndex;
  }
}