import { log } from '../../../utils/logger/logger.js';

const file = 'setPageStartIndex.js';

export const setPageStartIndex = async (page, worker, pagObj) => {
  log({file, func:'setPageStartIndex', worker, message:'START'});
  try {
    let pageUrl = pagObj.url;
    let startingIndex;
    let tempArr = [];
    let possibleIndex;
    await pageNav(page, worker, `${pageUrl.replace(/~~~/, '0')}`);
    let page0Urls = await getVehCardUrls(page, worker);
    if(page0Urls.length && pagObj.iterators[0] == 0){
      startingIndex = 0;
    } else {
      tempArr.push.apply(tempArr, page0Urls);
      possibleIndex = pagObj.iterators[0] < 3 ? 1 : pagObj.iterator[0];
      await pageNav(page, worker, `${pageUrl.replace(/~~~/, possibleIndex)}`);
      let page1Urls = await getVehCardUrls(page, worker);
      if(!page1Urls.length){
        log({level:'error', file, func:'setPageStartIndex', worker, message:'FAIL | Exiting setPageStartIndex: No vehicle cards found to set start index'});
        return undefined;
      }
      tempArr.push.apply(tempArr, page1Urls);
      tempArr = [...new Set(tempArr)];
      startingIndex = page0Urls.length ? tempArr.length == page0Urls.length ? possibleIndex : 0 : possibleIndex;
    }
    log({file, func:'setPageStartIndex', worker, message:'SUCCESS | Exiting setPageStartIndex', obj:startingIndex});
    return startingIndex;
  } catch (e) {
    log({level:'error', file, func:'setPageStartIndex', worker, message:'FAIL | Exiting setPageStartIndex', error:e});
  }
}