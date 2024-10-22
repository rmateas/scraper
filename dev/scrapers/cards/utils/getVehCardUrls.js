import comVehMakes from './comMakes.json' with { type: "json" };
import log from '../../../utils/logger/logger.js';

const file = 'getVehCardUrls.js';
const func = 'getVehCardUrls';

export const getVehCardUrls = async (page, worker) => {
  log({file, func, worker, message:'START'});
  let getCards = {
    cards: [],
    error: null
  }
  let allHrefs;
  try {

    //Gets all links taht are visible on the page, prevents scraper from getrting trap links if present
    // unfortunately this method of grabbing urls results in having to wait for content to load on a dynamic page which is far slower than just grabbing the urls out of the DOM 
    // const links = page.getByRole('link');
    // const allLinks = await links.all();
    // allHrefs = await Promise.all(
    //   allLinks.map(link => link.getAttribute('href'))
    // )

    allHrefs = [...new Set(await page.$$eval('a', urls => urls.map(url => url.href)))];
  } catch (error) {
    log({level:'error', file, func, worker, message:'Error getting card urls', error});
    getCards.error = {level:'error', file, func, worker, type:'CONTENT', message:'Error getting card urls', error};
    return getCards;
  }
  
  
  // console.log(allHrefs);

  
  // template3 Specific Exclusion : \?mode
  let rejectUrlRx = /google|facebook|youtube|video|gallery|modal|^javascript|^#|^tel|\?mode|\?ai_(slide_show|ask_about)|comparison/i;
  let acceptUrlRx = /\/inventory\/|new|used|19[5-9]\d|20[0-3]\d/;
  let makeRx1 = /(?<=(\/|-|_)(19[5-9]|20[0-3])\d(\/|-|_|-\+-))\w+\b/ //template1
  let makeRx2 = /(?<=\/inventory\/)\w+\b(?=\/\w+)/ //template4 | Can use link text to verify year and make instead if needed
  for(let url of allHrefs){
    if(!rejectUrlRx.test(url) && acceptUrlRx.test(url)){
      let make = makeRx1.test(url) ? url.match(makeRx1)[0] :
        makeRx2.test(url) ? url.match(makeRx2)[0] : '';
      make && comVehMakes.includes(make.toLowerCase()) && getCards.cards.push(url);
    }
  }
  
  getCards.cards.sort((a, b) => a.length - b.length);

  // Check and remove urls that are for the same car but have different endings
  for(let i = 0; i < getCards.cards.length; i++){
    let urlDupCheck = getCards.cards[i];
    let dup = getCards.cards.filter(url => {if(url.includes(urlDupCheck)){return url}})
    for(let j = 1; j < dup.length; j++){
      if((dup.length - urlDupCheck.length) < 15){
        getCards.cards.splice(getCards.cards.indexOf(dup[j]), 1);
      }
    }
  }
  log({file, func, worker, message:'SUCCESS', obj:getCards});
  return getCards;
}

/*******************   FOR BROWSER USE            **************/
  // let comVehMakes = ["acura","toyota","volkswagen","nissan","honda","ford","mazda","audi","bmw","cadillac","chevy","chevrolet","chrysler","dodge","gmc","hyundai","infiniti","jeep","kia","lexus","mercedes","mercedesbenz","ram","subaru","volvo","mini","buick","fiat","genesis","jaguar","land","landrover","lincoln","porsche","alfa","alfaromeo","aston","astonmartin","bentley","ferrari","lamborghini","lucid","grand","grandwagoneer","hummer","international","isuzu","maserati","mclaren","mercury","mitsubishi","oldsmobile","plymouth","polestar","pontiac","rivian","saab","saturn","scion","sprinter","suzuki","tesla","smart","wagoneer"]

  // let getCards = { cards: [] };
  // let allHrefs = [...new Set(Array.from(document.querySelectorAll('a'), url => url.href))];
  // let rejectUrlRx = /google|facebook|youtube|video|gallery|modal|^javascript|^#|^tel|\?mode|\?ai_(slide_show|ask_about)|comparison/i;
  // let acceptUrlRx = /\/inventory\/|new|used|19[5-9]\d|20[0-3]\d/;
  // let makeRx1 = /(?<=(\/|-|_)(19[5-9]|20[0-3])\d(\/|-|_|-\+-))\w+\b/ //template1
  // let makeRx2 = /(?<=\/inventory\/)\w+\b(?=\/\w+)/ //template4 | Can use link text to verify year and make instead if needed
  // for(let url of allHrefs){
  //   if(!rejectUrlRx.test(url) && acceptUrlRx.test(url)){
  //     let make = makeRx1.test(url) ? url.match(makeRx1)[0] :
  //       makeRx2.test(url) ? url.match(makeRx2)[0] : '';
  //     make && comVehMakes.includes(make.toLowerCase()) && getCards.cards.push(url);
  //   }
  // }
  
  // getCards.cards.sort((a, b) => a.length - b.length);

  // for(let i = 0; i < getCards.cards.length; i++){
  //   let urlDupCheck = getCards.cards[i];
  //   let dup = getCards.cards.filter(url => {if(url.includes(urlDupCheck)){return url}})
  //   for(let j = 1; j < dup.length; j++){
  //     if((dup.length - urlDupCheck.length) < 15){
  //       getCards.cards.splice(getCards.cards.indexOf(dup[j]), 1);
  //     }
  //   }
  // }
  // console.log(getCards.cards);