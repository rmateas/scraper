import { pageNav } from '../../../utils/navigation.js';
import { getVehCardUrls } from './getVehCardUrls.js';
import { log } from '../../../utils/logger/logger.js';

let file = 'getVehCards.js';

export const getCardsFromDealer =  async (page, worker, seller, isNewInv) => {
  log({level:'debug', file, func:'getCardsFromDealer', worker, message:'START'});
  let invUrl = isNewInv ? seller.pageInvUrlNew : seller.pageInvUrlUsed;
  let startIndex = seller.pageStartIndex;
  let vehCardArr = [];
  let vehCardsPerPageArr = [];

  // TEMPORARY COMMENT: Had to comment out the scroll events(scrollToPageBottom()) as they are handled differnetly in headless vs. headfull mode which interfere with docker abilities

  // let scrollToPageBottom = async () => {
  //   await page.evaluate(() => {window.scrollTo(0, window.document.body.scrollHeight)});
  //   await page.waitForTimeout(2000);
  // }

  let getPageHeight = async () => await page.evaluate(() => {return {current: document.documentElement.clientHeight + window.scrollY,total: window.document.body.scrollHeight}});

  let getCardsUni = async () => {
    log({level:'debug', file, func:'getCardsUni', worker, message:'START'});
    let oldUrlLen = 0, newUrlLen = 0;
    do {
      oldUrlLen = vehCardArr.length;
      startIndex += seller.pageIterator;
      await pageNav(page, invUrl.replace(/~~~/, startIndex));
      // await scrollToPageBottom();
      vehCardArr.push.apply(vehCardArr, (await getVehCardUrls(page, worker)));
      vehCardArr = [...new Set(vehCardArr)];
      newUrlLen = vehCardArr.length;
      vehCardsPerPageArr.push(newUrlLen - oldUrlLen);
    } while (oldUrlLen != newUrlLen);
    log({level:'debug', file, func:'getCardsUni', worker, message:'SUCCESS'});
  }

  let getCardsTemp3 = async () => {
    log({level:'debug', file, func:'getCardsTemp3', worker, message:'START'});
    try {
      //Site changes pages using function execution rather than url navigation
      await page.evaluate(() => {
        let pageSizeSelectors = document.getElementById('cboPageSize').options;
        pageSizeSelectors[pageSizeSelectors.length-1].selected = true;
        window.changePageSize();
      });
      await page.waitForTimeout(2000);
    } catch (e) {
      log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR CHANGING PAGES', error:e});
    }
    //add check to make sure more cards were loaded in, for cases where the network hangs
    let nextPageObj = {value: 2};
    vehCardsPerPageArr = [];
    let oldUrlLeng = 0;
    try {
      while (!(await page.$('[aria-label="Next"].disabled'))) {
        oldUrlLeng = vehCardArr.length;
        vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
        vehCardArr = [...new Set(vehCardArr)];
        vehCardsPerPageArr.push(vehCardArr.length - oldUrlLeng);
        await page.evaluate(nextPageObj => {window.changePage(nextPageObj)}, nextPageObj);
        await page.waitForTimeout(3000);
        nextPageObj.value++;
      }
    } catch (e) {
      log({level:'error', file, func:'getCardsTemp3', worker, message:'ERROR FINDING THE END OF PAGINATION', error:e});
    }
    vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
    log({level:'debug', file, func:'getCardsTemp3', worker, message:'SUCCESS'});
    return [...new Set(vehCardArr)];
  }


  //***** Execution *****//
  await pageNav(page, invUrl.replace(/~~~/, startIndex));
  // await scrollToPageBottom();
  vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
  vehCardsPerPageArr.push(vehCardArr.length);

  if(seller.sellerTemplate == 'template3'){
    await getCardsTemp3();
  } else {
    // let pageHeight = await getPageHeight();
    // if(pageHeight.current != pageHeight.total){
    //   let oldCardsLength = vehCardArr.length;
    //   try {
    //     do {
    //       await scrollToPageBottom();
    //       pageHeight = await getPageHeight();
    //       await page.waitForTimeout(2000);
    //     } while (pageHeight.current <= pageHeight.total && (pageHeight.total - pageHeight.current) > 40);
    //   } catch (e) {
    //     log({level:'error', file, func:'getCardsFromDealer', worker, message:'ERROR WITH SCROLL EVENTS', error:e});
    //     throw new Error();
    //   }
    //   vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page, worker));
    //   vehCardArr = [...new Set(vehCardArr)];
    //   if(oldCardsLength == vehCardArr.length){
    //     await getCardsUni();
    //   } else {
    //     vehCardsPerPageArr[0] = vehCardArr.length;
    //   }
    // } else {
      await getCardsUni();
    // }
  }
  log({level:'debug', file, func:'getCardsFromDealer', worker, message:'SUCCESS'});
  return {vehCardArr, vehCardsPerPageArr};
}