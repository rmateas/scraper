import { log } from '../../../utils/logger/logger.js';

const file = 'findAllPaginationUrls.js';

/**
 * Finds all urls that might be related to pagination and tries to set a page iterator and limit
 * @param {Object} page 
 * @param {Number} worker 
 * @returns Object
 */
export const findAllPaginationUrls = async (page, worker) => {
  log({level:'debug', file, func:'findAllPaginationUrls', worker, message:'START'});
  try{
    let posPagUrls =  await page.evaluate(() => {
      let paginationUrls = [];
      let possibleUrl;
      let iterator;
      let urlMatch;
      let replaceRx;
      let urlMatchRx = /\b_?(p(t|g|age(_no)?)?|start)(-|=)\d\d?\d?\d?\d?/;
      let urlCardLimitRx = /&\b(pager|limit)=\d\d?\d?|\b(pager|limit)=\d\d?\d?\d?\d?&/;
      let allUrls = [];
      document.querySelectorAll('a').forEach(url => {urlMatchRx.test(url.href) && !/\/#/.test(url.href) && allUrls.push(url.href)});
      allUrls = [...new Set(allUrls)];
      allUrls.sort((a,b)=>{return a.length-b.length});
      allUrls.forEach(url => {
        urlMatch = url.match(urlMatchRx)[0];
        iterator = +urlMatch.replace(/[^\d]/g, '');
        urlMatch = urlMatch.replace(/\d/g, '');
        replaceRx = new RegExp(`(?<=(\\b${urlMatch}))\\d\\d?\\d?\\d?\\d?`);
        possibleUrl = url.replace(replaceRx, '~~~');
        possibleUrl = !/^http/.test(url) ? location.origin+possibleUrl : possibleUrl;
        if(urlCardLimitRx.test(possibleUrl)){
          let limitMatch = url.match(urlCardLimitRx)[0];
          let cardLimit = +limitMatch.replace(/[^\d]/g, '');
          let limitMatched = limitMatch.replace(/\d\d?\d?\d?\d?/, '@@@');
          limitMatched = /&$/.test(limitMatched) ? `&${limitMatched.replace(/&/,'')}` : limitMatched;
          let limitUrl = possibleUrl.replace(limitMatch, '');
          let exists = paginationUrls.find(el => {
            if(el.url == limitUrl){
              el.limitMatch = limitMatched;
              el.limit = 'limit' in el ? el.limit < cardLimit ? cardLimit: el.limit : cardLimit;
            }
            return true;
          });
          !exists && paginationUrls.push({url:limitUrl, iterators:[iterator], limit:cardLimit, limitMatch:limitMatched});
        } else {
          let exists = paginationUrls.find(el => el.url === possibleUrl && el.iterators.push(iterator));
          !exists && paginationUrls.push({url:possibleUrl, iterators:[iterator]});
        }
      });
      for(let url of paginationUrls){
        if('limit' in url){
          url = {url: `${url.url}${url.limitMatch.replace(/@@@/, url.limit)}`, iterators:url.iterators}
        }
      }
      return paginationUrls;
    });
    log({level:'debug', file, func:'findAllPaginationUrls', worker, message:'SUCCESS | Exiting findAllPaginationUrls', obj:posPagUrls});
    return posPagUrls;
  } catch (error) {
    await log({level:'error', file, func:'findAllPaginationUrls', worker, message:'FAIL | Exiting findAllPaginationUrls', error});
    throw new Error(`Error getting possible pagination URLs`);
  }
}