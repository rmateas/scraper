const pageNav = require("../template/navigation.js");
const { log, devLog} = require('../template/logger.js');
const findInvUrls = require('../getPosInvUrls.js');
const getVehCardUrls = require('../cards/getVehCardUrls.js');
const getVehCards = require('../cards/getVehCards.js');

module.exports = async (page, worker, seller) => {

  devLog(worker, 'getPag.js', 'getPag', `In getInvUrls`);

  let invUrls = {
    newInvUrl:'',
    usedInvUrl:'',
    startIndex:0,
    iterator:0,
    vehNumTotalNew:0,
    vehNumPerPageNewArr:[],
    vehNumTotalUsed:0,
    vehNumPerPageUsedArr:[],
    cards:[]
  }

  //Gets all possible page navigation links for inventory and sets page card limiter if available
  let getPossiblePagUrls = async () => {
    devLog(worker, 'getPag.js', 'getPossiblePagUrls', `Start`);
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
      devLog(worker, 'getPag.js', 'getPossiblePagUrls', `SUCCESS | Exiting getPossiblePagUrls`, posPagUrls);
      return posPagUrls;
    } catch (e) {
      devLog(worker, 'getPag.js', 'getPossiblePagUrls', `FAIL | Exiting getPossiblePagUrls`, e);
      throw new Error(`Error getting possible pagination URLs`);
    }
  }

  let setPageStartIndex = async (pagObj) => {
    devLog(worker, 'getPag.js', 'setPageStartIndex', 'Start');
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
          devLog(worker, 'getPag.js', 'setPageStartIndex', `FAIL | Exiting setPageStartIndex: No vehicle cards found to set start index`);
          throw new Error('Error setting startIndex');
        }
        tempArr.push.apply(tempArr, page1Urls);
        tempArr = [...new Set(tempArr)];
        startingIndex = page0Urls.length ? tempArr.length == page0Urls.length ? possibleIndex : 0 : possibleIndex;
      }
      devLog(worker, 'getPag.js', 'setPageStartIndex', `SUCCESS | Exiting setPageStartIndex:`, startingIndex);
      return startingIndex;
    } catch (e) {
      devLog(worker, 'getPag.js', 'setPageStartIndex', `FAIL | Exiting setPageStartIndex`, e);
      throw new Error(`Error setting pageStartIndex`);
    }
  }

  let setPageIterator = async (pagObj) => {
    devLog(worker, 'getPag.js', 'setPageIterator', `Start`);
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
      devLog(worker, 'getPag.js', 'serPageIterator', `SUCCESS | Exiting setPageIterator:`, pageIterator);
      return pageIterator;
    } catch (e) {
      devLog(worker, 'getPag.js', 'serPageIterator', `FAIL | Exiting setPageIterator`, e);
      throw new Error(`Error setting pageIterator`);
    }
  }

  let findPossiblePag = async (invUrlArr) => {
    devLog(worker, 'getPag.js', 'findPossiblePag', `Start`);
    try {
      let foundPossiblePagUrls = [];
      for (let invUrl of invUrlArr) {
        devLog(worker, 'getPag.js', 'findPossiblePag', `Possible Inv Url: ${invUrl}`);
        try {
          await pageNav(page, worker, `${seller.sellerUrl}${invUrl}`);
          let cardCheck = await getVehCardUrls(page, worker);
          if(!cardCheck.length){continue;}
          invUrls.cards.push.apply(invUrls.cards, cardCheck);
          for(let paginationObj of await getPossiblePagUrls()){
            let pageIterator = await setPageIterator(paginationObj);
            let startIndex = await setPageStartIndex(paginationObj);
            if(!pageIterator){continue;}
            foundPossiblePagUrls.push({url: paginationObj.url, pageStartIndex:startIndex, pageIterator:pageIterator, sellerTemplate:seller.sellerTemplate});
          }
        } catch (e) {
          log(worker, 'getPag.js', 'findPossiblePag',`FAIL | Error finding possible pagination : ${invUrl}`, e);
          continue;
        }
      }
      devLog(worker, 'getPag.js', 'findPossiblePag', `SUCCESS | Exiting findPossiblePag`, foundPossiblePagUrls);
      return foundPossiblePagUrls;
    } catch (e) {
      devLog(worker, 'getPag.js', 'findPossiblePag', `FAIL | Exiting findPossiblePag`, e);
      throw new Error(`Error finding possible pagination`);
    }
  }

  let setPag = async (arr, isNewInv = false) => {
    devLog(worker, 'getPag.js', 'setPag', 'Start');
    try {
      for(let i = 0; i < arr.length; i++){
        isNewInv ? arr[i].pageInvUrlNew = arr[i].url : arr[i].pageInvUrlUsed = arr[i].url;
        let foundCards = await getVehCards(page, worker, arr[i], isNewInv);
        arr[i].cards = foundCards.vehCardArr;
        arr[i].cardsPerPageArr = foundCards.vehCardsPerPageArr;
      }
      let bestPagOption = arr.find(elm => elm.cards.length == Math.max(...arr.map(el => el.cards.length)));
      invUrls.startIndex = bestPagOption.startIndex;
      invUrls.iterator = bestPagOption.iterator;
      isNewInv ? (invUrls.vehNumTotalNew = bestPagOption.cards.length, invUrls.vehNumPerPageNewArr = bestPagOption.cardsPerPageArr, invUrls.newInvUrl = bestPagOption.url) : 
      (invUrls.vehNumTotalUsed = bestPagOption.cards.length, invUrls.vehNumPerPageUsedArr = bestPagOption.cardsPerPageArr, invUrls.usedInvUrl = bestPagOption.url);
      invUrls.cards.push.apply(invUrls.cards, bestPagOption.cards);
      devLog(worker, 'getPag.js', 'setPag', `Exiting setPag: success`, bestPagOption);
      return [bestPagOption];
    } catch (e) {
      devLog(worker, 'getPag.js', 'setPag', `Exiting setPag: fail`, e);
      throw new Error(`Error setting pagination`);
    }
  }

  //********  EXECUTION  *********//
  let possibleUrls = await findInvUrls(page);
  devLog(worker, 'getPage.js', 'getPag', 'Found URLs:', possibleUrls);
  let newInvPage = [];
  let usedInvPage = [];

  //Find possible pagination for new and used
  if(possibleUrls.new.length){
    newInvPage = await findPossiblePag(possibleUrls.new);
  } else {
    log(worker, 'getPag.js', 'getPag', `No possible new inventory urls found`);
  }

  if(possibleUrls.used.length){
    for(let i = 0; i < possibleUrls.length;){
      /all/i.test(possibleUrls.used[i]) ? /(?=.*all)(?=.*used)/.test(possibleUrls.used[i]) ? i++ : possibleUrls.used.splice(i, 1) : i++;
    }
    usedInvPage = await findPossiblePag(possibleUrls.used);
  } else {
    log(worker, 'getPag.js', 'getPag', `No possible used inventory urls found`);
    throw new Error('FAIL | No Inv Urls');
  }

  //Set pagination for new and used
  if (newInvPage.length) {
    newInvPage = await setPag(newInvPage, true);
  } else {
    log(worker, 'getPag.js', 'getPag', `Not able to set new pagination`);
  }

  if(usedInvPage.length){
    usedInvPage = await setPag(usedInvPage);
  } else {
    log(worker, 'getPag.js', 'getPag', `Not able to set used pagination`);
  }

  //Set startIndex if it's not the same for new and used
  if (newInvPage.length && newInvPage[0].startIndex != usedInvPage[0].startIndex && newInvPage[0].startIndex < usedInvPage[0].startIndex) {
    invUrls.startIndex = newInvPage[0].startIndex;
  }

  //Set iterator is it's not the same for new and used
  if (newInvPage.length && newInvPage[0].iterator != usedInvPage[0].iterator && newInvPage[0].iterator < usedInvPage[0].iterator) {
    invUrls.iterator = newInvPage[0].iterator;
  }

  invUrls.cards = [...new Set(invUrls.cards)];
  devLog(worker, 'getPag.js', 'getPag', `SUCCESS | Returned content from getInvUrls`, invUrls);
  return invUrls;
};