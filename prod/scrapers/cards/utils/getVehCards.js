import { pageNav } from '../../../utils/navigation.js';
import { getVehCardUrls } from './getVehCardUrls.js';

export const getAllCardsFromDealer =  async (page, seller, isNewInv) => {
  let invUrl = isNewInv ? seller.pageInvUrlNew : seller.pageInvUrlUsed;
  let startIndex = seller.pageStartIndex;
  let vehCardArr = [];
  let vehCardsPerPageArr = [];

  let scrollToPageBottom = async () => {
    await page.evaluate(() => {window.scrollTo(0, window.document.body.scrollHeight)});
    await page.waitForTimeout(2000);
  }

  let getPageHeight = async () => await page.evaluate(() => {return {current: document.documentElement.clientHeight + window.scrollY,total: window.document.body.scrollHeight}});

  let getCardsUni = async () => {
    let oldUrlLen = 0, newUrlLen = 0;
    do {
      oldUrlLen = vehCardArr.length;
      startIndex += seller.pageIterator;
      await pageNav(page, invUrl.replace(/~~~/, startIndex));
      await scrollToPageBottom();
      vehCardArr.push.apply(vehCardArr, (await getVehCardUrls(page)));
      vehCardArr = [...new Set(vehCardArr)];
      newUrlLen = vehCardArr.length;
      vehCardsPerPageArr.push(newUrlLen - oldUrlLen);
    } while (oldUrlLen != newUrlLen);
  }

  let getCardsTemp3 = async () => {
    try {
      //Site changes pages using function execution rather than url navigation
      await page.evaluate(() => {
        let pageSizeSelectors = document.getElementById('cboPageSize').options;
        pageSizeSelectors[pageSizeSelectors.length-1].selected = true;
        window.changePageSize();
      });
      await page.waitForTimeout(2000);
    } catch (e) {
      // ********************************
    }
    //add check to make sure more cards were loaded in, for cases where the network hangs
    let nextPageObj = {value: 2};
    vehCardsPerPageArr = [];
    let oldUrlLeng = 0;
    try {
      while (!(await page.$('[aria-label="Next"].disabled'))) {
        oldUrlLeng = vehCardArr.length;
        vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page));
        vehCardArr = [...new Set(vehCardArr)];
        vehCardsPerPageArr.push(vehCardArr.length - oldUrlLeng);
        await page.evaluate(nextPageObj => {window.changePage(nextPageObj)}, nextPageObj);
        await page.waitForTimeout(3000);
        nextPageObj.value++;
      }
    } catch (e) {
      // *******************************************
    }
    vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page))
    return [...new Set(vehCardArr)];
  }


  //***** Execution *****//
  await pageNav(page, invUrl.replace(/~~~/, startIndex));
  await scrollToPageBottom();
  vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page));
  vehCardsPerPageArr.push(vehCardArr.length);

  if(seller.sellerTemplate == 'template3'){
    await getCardsTemp3();
  } else {
    let pageHeight = await getPageHeight();
    if(pageHeight.current != pageHeight.total){
      let oldCardsLength = vehCardArr.length;
      try {
        do {
          await scrollToPageBottom();
          pageHeight = await getPageHeight();
          await page.waitForTimeout(2000);
        } while (pageHeight.current <= pageHeight.total && (pageHeight.total - pageHeight.current) > 40);
      } catch (e) {
        throw new Error(`Error with scroll events | getVehCards.js | ${e}`);
      }
      vehCardArr.push.apply(vehCardArr, await getVehCardUrls(page));
      vehCardArr = [...new Set(vehCardArr)];
      if(oldCardsLength == vehCardArr.length){
        await getCardsUni();
      } else {
        vehCardsPerPageArr[0] = vehCardArr.length;
      }
    } else {
      await getCardsUni();
    }
  }
  return {vehCardArr, vehCardsPerPageArr};
}