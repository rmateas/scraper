import { setTimeout } from 'node:timers/promises'; 

import log from '../../../utils/logger/logger.js';
import { pageNav } from '../../../utils/navigation.js';
import { getVehCardUrls } from './getVehCardUrls.js';

let file = 'getVehCards.js';

export const getCardsFromDealer =  async (page, worker, seller, isNewInv) => {
  log({file, func:'getCardsFromDealer', worker, message:'START'});
  let invUrl = isNewInv ? seller.pageInvUrlNew : seller.pageInvUrlUsed;
  let startIndex = seller.pageStartIndex;
  let vehCardArr = [];
  let vehCardsPerPageArr = [];

  let getCardsUni = async () => {
    log({file, func:'getCardsUni', worker, message:'START'});
    let oldUrlLen = 0, newUrlLen = 0;
    do {
      oldUrlLen = vehCardArr.length;
      startIndex += seller.pageIterator;
      let navResult = await pageNav(page, worker, invUrl.replace(/~~~/, startIndex));
      if(!navResult.status){
        vehCardsPerPageArr.push({url: navResult.url, cardsOnPage: 0, error: navResult.message});
        log({level:'error', file, func:'getCardsUni', worker, message:'FAIL NAV', error: navResult.message});
        continue;
      }
      let cards = await getVehCardUrls(page, worker);
      if (cards.error) {
        log({level:'warn', file, func:'getCardsUni', worker, message:'ERROR GETTING CARDS FROM DEALER', error:cards.error});
        continue;
      }
      vehCardArr.push.apply(vehCardArr, cards.cards);
      vehCardArr = [...new Set(vehCardArr)];
      newUrlLen = vehCardArr.length;
      vehCardsPerPageArr.push({url: navResult.url, cardsOnPage: cards.cards.length, error:null});
    } while (oldUrlLen != newUrlLen);
    log({file, func:'getCardsUni', worker, message:'SUCCESS'});
  }

  let getCardsTemp3 = async () => {
    log({file, func:'getCardsTemp3', worker, message:'START'});
    try {
      //Site changes pages using function execution rather than url navigation
      await page.evaluate(() => {
        let pageSizeSelectors = document.getElementById('cboPageSize').options;
        pageSizeSelectors[pageSizeSelectors.length-1].selected = true;
        window.changePageSize();
      });
      await setTimeout(2000);
    } catch (error) {
      await log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR CHANGING PAGES', error});
    }
    //add check to make sure more cards were loaded in, for cases where the network hangs
    let nextPageObj = {value: 2};
    let oldUrlLeng = 0;
    try {
      while (!(await page.$('[aria-label="Next"].disabled'))) {
        oldUrlLeng = vehCardArr.length;
        let cards = await getVehCardUrls(page, worker);
        if (cards.error) {
          log({level:'warn', file, func:'getCardsUni', worker, message:'ERROR GETTING CARDS FROM DEALER', error:cards.error});
          continue;
        }
        vehCardArr.push.apply(vehCardArr, cards.cards);
        vehCardArr = [...new Set(vehCardArr)];
        vehCardsPerPageArr.push({url: invUrl.replace(/~~~/, nextPageObj.value), cardsOnPage: cards.cards.length, error:null});
        await page.evaluate(nextPageObj => {window.changePage(nextPageObj)}, nextPageObj);
        await setTimeout(3000);
        nextPageObj.value++;
      }
    } catch (error) {
      vehCardsPerPageArr.push({url: invUrl.replace(/~~~/, nextPageObj.value), cardsOnPage: cards.length, error});
      await log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR FINDING THE END OF PAGINATION', error});
    }
    let lastPageCards = await getVehCardUrls(page, worker);
    vehCardArr.push.apply(vehCardArr, lastPageCards);
    vehCardsPerPageArr.push({url: invUrl.replace(/~~~/, nextPageObj.value), cardsOnPage: lastPageCards.length});
    log({file, func:'getCardsTemp3', worker, message:'SUCCESS'});
    return [...new Set(vehCardArr)];
  }


  //***** Execution *****//
  
  let mainNavResult = await pageNav(page, worker, invUrl.replace(/~~~/, startIndex));
  if(!mainNavResult.status){
    vehCardsPerPageArr.push({url: mainNavResult.url, cards: 0, error: mainNavResult.message});
    log({level:'error', file, func:'getCardsUni', worker, message:'FAIL NAV', error: navResult.message});
    return {vehCardArr, vehCardsPerPageArr};
  }
  vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
  vehCardsPerPageArr.push(vehCardArr.length);
  seller.sellerTemplate == 'template3' ? await getCardsTemp3() : await getCardsUni();
  log({file, func:'getCardsFromDealer', worker, message:'SUCCESS'});
  return {vehCardArr, vehCardsPerPageArr};
}

// export const getCardsFromDealer =  async (page, worker, seller, isNewInv) => {
//   log({file, func:'getCardsFromDealer', worker, message:'START'});
//   let invUrl = isNewInv ? seller.pageInvUrlNew : seller.pageInvUrlUsed;
//   let startIndex = seller.pageStartIndex;
//   let vehCardArr = [];
//   let vehCardsPerPageArr = [];

//   // TEMPORARY COMMENT: Had to comment out the scroll events(scrollToPageBottom()) as they are handled differnetly in headless vs. headfull mode which interfere with docker abilities

//   // let scrollToPageBottom = async () => {
//   //   await page.evaluate(() => {window.scrollTo(0, window.document.body.scrollHeight)});
//   //   await setTimeout(2000);
//   // }

//   // let getPageHeight = async () => await page.evaluate(() => {return {current: document.documentElement.clientHeight + window.scrollY,total: window.document.body.scrollHeight}});

//   let getCardsUni = async () => {
//     log({file, func:'getCardsUni', worker, message:'START'});
//     let oldUrlLen = 0, newUrlLen = 0;
//     do {
//       oldUrlLen = vehCardArr.length;
//       startIndex += seller.pageIterator;
//       await pageNav(page, invUrl.replace(/~~~/, startIndex));
//       // await scrollToPageBottom();
//       vehCardArr.push.apply(vehCardArr, (await getVehCardUrls(page, worker)));
//       vehCardArr = [...new Set(vehCardArr)];
//       newUrlLen = vehCardArr.length;
//       vehCardsPerPageArr.push(newUrlLen - oldUrlLen);
//     } while (oldUrlLen != newUrlLen);
//     log({file, func:'getCardsUni', worker, message:'SUCCESS'});
//   }

//   let getCardsTemp3 = async () => {
//     log({file, func:'getCardsTemp3', worker, message:'START'});
//     try {
//       //Site changes pages using function execution rather than url navigation
//       await page.evaluate(() => {
//         let pageSizeSelectors = document.getElementById('cboPageSize').options;
//         pageSizeSelectors[pageSizeSelectors.length-1].selected = true;
//         window.changePageSize();
//       });
//       await setTimeout(2000);
//     } catch (error) {
//       await log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR CHANGING PAGES', error});
//     }
//     //add check to make sure more cards were loaded in, for cases where the network hangs
//     let nextPageObj = {value: 2};
//     vehCardsPerPageArr = [];
//     let oldUrlLeng = 0;
//     try {
//       while (!(await page.$('[aria-label="Next"].disabled'))) {
//         oldUrlLeng = vehCardArr.length;
//         vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
//         vehCardArr = [...new Set(vehCardArr)];
//         vehCardsPerPageArr.push(vehCardArr.length - oldUrlLeng);
//         await page.evaluate(nextPageObj => {window.changePage(nextPageObj)}, nextPageObj);
//         await setTimeout(3000);
//         nextPageObj.value++;
//       }
//     } catch (error) {
//       await log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR FINDING THE END OF PAGINATION', error});
//     }
//     vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
//     log({file, func:'getCardsTemp3', worker, message:'SUCCESS'});
//     return [...new Set(vehCardArr)];
//   }


//   //***** Execution *****//
//   await pageNav(page, invUrl.replace(/~~~/, startIndex));
//   // await scrollToPageBottom();
//   vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
//   vehCardsPerPageArr.push(vehCardArr.length);

//   if(seller.sellerTemplate == 'template3'){
//     await getCardsTemp3();
//   } else {
//     // let pageHeight = await getPageHeight();
//     // if(pageHeight.current != pageHeight.total){
//     //   let oldCardsLength = vehCardArr.length;
//     //   try {
//     //     do {
//     //       await scrollToPageBottom();
//     //       pageHeight = await getPageHeight();
//     //       await setTimeout(2000);
//     //     } while (pageHeight.current <= pageHeight.total && (pageHeight.total - pageHeight.current) > 40);
//     //   } catch (e) {
//     //     log({level:'error', file, func:'getCardsFromDealer', worker, message:'ERROR WITH SCROLL EVENTS', error:e});
//     //     throw new Error();
//     //   }
//     //   vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
//     //   vehCardArr = [...new Set(vehCardArr)];
//     //   if(oldCardsLength == vehCardArr.length){
//     //     await getCardsUni();
//     //   } else {
//     //     vehCardsPerPageArr[0] = vehCardArr.length;
//     //   }
//     // } else {
//       await getCardsUni();
//     // }
//   }
//   log({file, func:'getCardsFromDealer', worker, message:'SUCCESS'});
//   return {vehCardArr, vehCardsPerPageArr};
// }