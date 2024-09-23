import 'dotenv/config';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth'

import { postAPI } from '../utils/apiUtils.js';

chromium.use(stealth());

let isDev = /dev(eleopment)?/i.test(process.env.NODE_ENV);

process.env.HOST = isDev ? 'http://localhost:8080' : 'https://as-webs-api.azurewebsites.net';

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
    console.log('error setting up browser\n', error);
  }
  
  try {
    sellers = (await (await fetch(`${process.env.HOST}/seller/get?sellerUrl[exists]=true&httpResponse[exists]=false&select=sellerId,sellerUrl`)).json()).data;
    isDev ? console.log(sellers) : null;
  } catch (error) {
    console.log(`error getting urls from DB\n`, error)
  }

  try {
    do {
      console.log(sellers.length);
      let sellerArr = [];
      for (let i = 0; i < 20; i++) {
        if(!sellers.length) {
          break;
        } else {
          sellerArr.push(sellers.pop());
        }
      }

      for (const seller of sellerArr){
        let response;
        seller.httpResponse = null;
        try {
          response = await page.request.get(seller.sellerUrl);
          seller.httpResponse = response.status();  
        } catch (error) {
          seller.httpResponse = /(?<=←\s)\d\d\d/.test(error.message) ? +error.message.match(/(?<=←\s)\d\d\d/)[0] : 0;
          isDev ? console.log(`Error with ${seller.sellerUrl}\n`, error) : null;
        }
      }
      await postAPI(0, `${process.env.HOST}/seller/updatehttpvalidity`, JSON.stringify(sellerArr));
    } while (sellers.length)

  } catch (error) {
    console.log('Error while checking if urls are valid\n', error);
  } finally {
    isDev ? console.log(sellers) : null;
    process.exit();
  }
})()