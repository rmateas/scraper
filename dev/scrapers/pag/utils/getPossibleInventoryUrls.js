import { log } from '../../../utils/logger/logger.js';

const file = 'getPossibleInventoryUrls.js';
const func = 'getPossibleInventoryUrls';

export const getPossibleInventoryUrls = async (page, worker) => {
  log({file, func, worker, message:'START'});

  let invUrls = {
    new: [],
    used: [],
    allInvUrls: []
  }

  try {
    invUrls.allInvUrls = await page.evaluate(() => {
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
      return [...new Set(possibleUrlArr)];
    })
  } catch (error) {
    await log({level:'fatal', file, func, worker, message:'Error getting possible inventoy urls', error});
    return invUrls;
  }

  for (let url of invUrls.allInvUrls) {
    if (/^\/newandusedcars\?clearall=1$/.test(url)) {
      invUrls.new = [];
      invUrls.used = [url];
      break;
    }
    if (/\/((new|used)-(inventory|vehicles))((\/index)?[^\/]+)?$/.test(url) || /\/(search|new|used|(view-)?inventory|vehicles|pre-?owned)([^\/]+)?$/.test(url) || /\/search\/(new|used)(\w|-)+?\/\?cy=\w{5,6}&tp=(new|used)$/.test(url)) {
      /new/i.test(url) ? invUrls.new.push(url) : invUrls.used.push(url);
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
      isNewInv ? invUrls.new = smallUrls : invUrls.used = smallUrls;
    } else {
      isNewInv ? invUrls.new = urls.slice(0,5) : invUrls.used = urls.slice(0,5)
    }
    log({file, func:'slimUrls', worker, message:`SLIMMING URLS FOR ${isNewInv ? 'NEW' : 'USED'}`})
  }
  if(invUrls.new.length > 5){slimUrls(invUrls.new, true);}
  if(invUrls.used.length > 5){slimUrls(invUrls.used);}
  return invUrls;
};