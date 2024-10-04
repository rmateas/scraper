import log from '../../../utils/logger/logger.js';

const file = 'findAllPaginationUrls.js';
const func = 'findAllPaginationUrls';

/**
 * Finds all urls that might be related to pagination and tries to set a page iterator and limit
 * @param {Object} page 
 * @param {Number} worker 
 * @returns Object
 */
export const findAllPaginationUrls = async (page, worker) => {
  log({level:'debug', file, func, worker, message:'START'});

  let pagination = {
    allUrls: [],
    filteredUrls: [],
    caughtErrors: []
  }

  let urlMatchRx = /\b_?(p(t|g|age(_no)?)?|start)(-|=)\d\d?\d?\d?\d?/;
  try {
    await page.$$eval('a', url => {urlMatchRx.test(url.href) && !/\/#/.test(url.href) && pagination.allUrls.push(url.href)});
  } catch (error) {
    pagination.caughtErrors.push({errorType:'CONTENT ERROR', message:'ERROR GETTING PAGINATION URLS', error});
  }

  if(!pagination.allUrls.length){return pagination;}
  pagination.allUrls = [...new Set(pagination.allUrls)].sort((a,b)=>a.length-b.length);

  // FIND POSSIBLE COMMON STRING FOR PAGINATION AND SEE IF IT EXISTS IN OTHER URLS
  for(let url of pagination.allUrls){
    let initialUrlMatch = url.match(urlMatchRx)[0];
    let iterator = +initialUrlMatch.replace(/[^\d]/g, '');
    let urlMatch = initialUrlMatch.replace(/\d/g, '');
    let replaceRx = new RegExp(`(?<=(\\b${urlMatch}))\\d\\d?\\d?\\d?\\d?`);
    let possibleUrl = url.replace(replaceRx, '~~~');
    // Looks to see if the portioned url without the pagination number already exists, if it does it will just add the pagination number to an existing array. Otherwise, add another array element with a url and iterator properties
    let exists = pagination.filteredUrls.find(el => el.url === possibleUrl && el.iterators.push(iterator));
    !exists && pagination.filteredUrls.push({url:possibleUrl, iterators:[iterator]});
  };

  return pagination;
}
  





  // try{
  //   let posPagUrls =  await page.evaluate(() => {
  //     document.querySelectorAll('a').forEach(url => {urlMatchRx.test(url.href) && !/\/#/.test(url.href) && allUrls.push(url.href)});
  //     allUrls = [...new Set(allUrls)];
  //     allUrls.sort((a,b)=>{return a.length-b.length});
  //     allUrls.forEach(url => {
  //       urlMatch = url.match(urlMatchRx)[0];
  //       iterator = +urlMatch.replace(/[^\d]/g, '');
  //       urlMatch = urlMatch.replace(/\d/g, '');
  //       replaceRx = new RegExp(`(?<=(\\b${urlMatch}))\\d\\d?\\d?\\d?\\d?`);
  //       possibleUrl = url.replace(replaceRx, '~~~');
  //       possibleUrl = !/^http/.test(url) ? location.origin+possibleUrl : possibleUrl;
  //       if(urlCardLimitRx.test(possibleUrl)){
  //         let limitMatch = url.match(urlCardLimitRx)[0];
  //         let cardLimit = +limitMatch.replace(/[^\d]/g, '');
  //         let limitMatched = limitMatch.replace(/\d\d?\d?\d?\d?/, '@@@');
  //         limitMatched = /&$/.test(limitMatched) ? `&${limitMatched.replace(/&/,'')}` : limitMatched;
  //         let limitUrl = possibleUrl.replace(limitMatch, '');
  //         let exists = paginationUrls.find(el => {
  //           if(el.url == limitUrl){
  //             el.limitMatch = limitMatched;
  //             el.limit = 'limit' in el ? el.limit < cardLimit ? cardLimit: el.limit : cardLimit;
  //           }
  //           return true;
  //         });
  //         !exists && paginationUrls.push({url:limitUrl, iterators:[iterator], limit:cardLimit, limitMatch:limitMatched});
  //       } else {
  //         let exists = paginationUrls.find(el => el.url === possibleUrl && el.iterators.push(iterator));
  //         !exists && paginationUrls.push({url:possibleUrl, iterators:[iterator]});
  //       }
  //     });
  //     for(let url of paginationUrls){
  //       if('limit' in url){
  //         url = {url: `${url.url}${url.limitMatch.replace(/@@@/, url.limit)}`, iterators:url.iterators}
  //       }
  //     }
  //     return paginationUrls;
  //   });
  //   log({level:'debug', file, func:'findAllPaginationUrls', worker, message:'SUCCESS | Exiting findAllPaginationUrls', obj:posPagUrls});
  //   return posPagUrls;
  // } catch (error) {
  //   await log({level:'error', file, func:'findAllPaginationUrls', worker, message:'FAIL | Exiting findAllPaginationUrls', error});
  //   throw new Error(`Error getting possible pagination URLs`);
  // }
// }