import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth'

import { postAPI } from '../utils/apiUtils.js';

chromium.use(stealth());

process.env.HOST = 'http://localhost:8080';

(async ()=>{
  let browser, page;
  let pickedProxy = '207.230.123.128:21242';
  let sellers;
  
  try {
    //args options | //https://peter.sh/experiments/chromium-command-line-switches/
    browser = await chromium.launchServer({
      proxy:{
        server:pickedProxy,
        username:process.env.PUSER,
        password:process.env.PPASS
      },
    });
    let browserConnect = await chromium.connect(browser.wsEndpoint());
    let context = await browserConnect.newContext();
    page = await context.newPage();
  } catch (error) {
    console.log('error setting up browser');
    console.log(error);
  }
  
  try {
    sellers = (await (await fetch(`${process.env.HOST}/seller/get?sellerUrl[exists]=true&select=sellerId,sellerUrl`)).json()).data;
    console.log(sellers);
  } catch (error) {
    console.log('error getting urls from DB');
    console.log(error);
  }

  try {
    for (const seller of sellers) {
      let response;
      seller.httpResponse = null;
      try {
        response = await page.request.get(seller.sellerUrl);
        seller.httpResponse = response.status();  
      } catch (error) {
        seller.httpResponse = +error.message.match(/(?<=←\s)\d\d\d/)[0];
        console.log(`Error with ${seller.sellerUrl}`);
        console.log(error);
      }
    }
  } catch (error) {
    console.log('Error while checking if urls are valid');
    console.log(error);
  } finally {
    console.log(sellers);
    await postAPI(0, `${process.env.HOST}/seller/updatehttpvalidity`, JSON.stringify(sellers));
    process.exit();
  }
})()