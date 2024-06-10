import comVehMakes from './comMakes.json' with { type: "json" };
import { log } from '../../../utils/logger/logger.js';

export const getVehCardUrls = async (page, worker) => {
  log({level:'debug', file, func:'getVehCardUrls', worker, message:'START'});
  let vehCardUrlArr = [];

  let allUrls = [...new Set(await page.$$eval('a', urls => urls.map(url => url.href)))];
  //template3 Exclusion : \?mode
  let rejectUrlRx = /google|facebook|youtube|video|gallery|modal|^javascript|^#|^tel|\?mode|\?ai_(slide_show|ask_about)|comparison/i;
  let acceptUrlRx = /\/inventory\/|new|used|19[5-9]\d|20[0-3]\d/;
  let makeRx1 = /(?<=(\/|-|_)(19[5-9]|20[0-3])\d(\/|-|_|-\+-))\w+\b/ //template1
  let makeRx2 = /(?<=\/inventory\/)\w+\b(?=\/\w+)/ //template4 | Can use link text to verify year and make instead if needed
  for(let url of allUrls){
    if(!rejectUrlRx.test(url) && acceptUrlRx.test(url)){
      let make = makeRx1.test(url) ? url.match(makeRx1)[0] :
        makeRx2.test(url) ? url.match(makeRx2)[0] : '';
      make && comVehMakes.includes(make.toLowerCase()) && vehCardUrlArr.push(url);
    }
  }
  
  vehCardUrlArr.sort((a, b) => a.length - b.length);

  for(let i = 0; i < vehCardUrlArr.length; i++){
    let urlDupCheck = vehCardUrlArr[i];
    let dup = vehCardUrlArr.filter(url => {if(url.includes(urlDupCheck)){return url}})
    for(let j = 1; j < dup.length; j++){
      if((dup.length - urlDupCheck.length) < 15){
        vehCardUrlArr.splice(vehCardUrlArr.indexOf(dup[j]), 1);
      }
    }
  }
  log({level:'debug', file, func:'getVehCardUrls', worker, message:'SUCCESS'});
  return vehCardUrlArr;
}