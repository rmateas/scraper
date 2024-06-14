import { log } from '../../../utils/logger/logger.js';

const file = 'getPossibleInventoryUrls.js';
const func = 'getPossibleInventoryUrls';

export const getPossibleInventoryUrls = async (page, worker) => {
  log({file, func, worker, message:'START'});
  let urls = {
    new: [],
    used: []
  }
  try {
    urls = await page.evaluate(() => {
      let Urls = {
        new: [],
        used: []
      };
      let possibleUrlArr = [];
      let possibleUrlsSnap = document.evaluate(`//a/@href[contains(., "/")]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      let urlRx = new RegExp(`\^\(\(https://www.\)\?${location.href}\|/\)`);
      let isUrlRx = /new|used|inventory|vehicle|search|pre-?owned/;
      let notPathUrlRx = /news\b|specials?|custom|tire|onstar|service|\/\/|#|under|efficient|quote|video|test|featured|maintenance|credit|\b(19|20)\d\d\b|price|payment|deals|commercial/i;
      let notQueryUrlRx = /\?(.+)?(body(style|type)|make|model|promotion|feature|classification|keyword)/i;
      for(let i = 0; i < possibleUrlsSnap.snapshotLength; i++){
        let url = possibleUrlsSnap.snapshotItem(i).textContent.trim().replace(/ /g, '%20').replace(/^\/\//, 'https://');
        url = urlRx.test(url) ? url.replace(/https:\/\/.+?\//, "/").replace(/\/$/, "") : url;
        if(!notPathUrlRx.test(url) && !notQueryUrlRx.test(url) && /^\//.test(url) && isUrlRx.test(url)){
          possibleUrlArr.push(url);
        }
      }
      possibleUrlArr = [...new Set(possibleUrlArr)];
  
      for (let url of possibleUrlArr) {
        if (/^\/newandusedcars\?clearall=1$/.test(url)) {
          Urls.new = [];
          Urls.used = [url];
          break;
        }
        if (/\/((new|used)-(inventory|vehicles))((\/index)?[^\/]+)?$/.test(url) || /\/(search|new|used|(view-)?inventory|vehicles|pre-?owned)([^\/]+)?$/.test(url) || /\/search\/(new|used)(\w|-)+?\/\?cy=\w{5,6}&tp=(new|used)$/.test(url)) {
          /new/i.test(url) ? Urls.new.push(url) : Urls.used.push(url);
        }
      }
  
      let slimUrls = (urls, isNewInv = false) => {
        urls = urls.sort((a,b) => {return a.length-b.length});
        let smallUrls = [];
        let shortUrls = [{url:urls[0],count:0}, {url:urls[1],count:0}, {url:urls[2],count:0}];
        for(let i = 0; i < shortUrls.length; i++){
          for(let url of urls){
            if(url.includes(shortUrls[i].url)){
              shortUrls[i].count++;
            }
          }
        }
        for(let short of shortUrls){
          short.count > 1 && smallUrls.push(short.url);
        }
  
        if(smallUrls.length){
          isNewInv ? Urls.new = smallUrls : Urls.used = smallUrls;
        } else {
          isNewInv ? Urls.new = urls.slice(0,5) : Urls.used = urls.slice(0,5)
        }
      }
  
      if(Urls.new.length > 5){
        slimUrls(Urls.new, true);
      }
  
      if(Urls.used.length > 5){
        slimUrls(Urls.used);
      }
      return Urls;
    });
  } catch (error) {
    log({level:'fatal', file, func, worker, message:'Error getting possible inventoy urls', error});
  } finally {
    return urls;
  }
};