import log from '../../../utils/logger/logger.js';

import dataAttributes from './getVehDataAttr.js';
import apiInfo from './getVehInfoApi.js';

const file = 'getVehInfo.js';
const func = 'default';

export default async (page, worker, carSpecs) => {
  log({file, func, worker, message:'START'});

  let errArr = [];
  try {
    log({file, func, worker, message:'Getting VIN'});
    carSpecs.vin = await page.evaluate(() => {
      let vin;
      let vinVal = (v) => {
        let vinRx = /[A-HJ-NPR-Z0-9]{17}/;
        v = v?.trim();
        return vinRx.test(v) ? v.match(vinRx)[0] : '';
      }

      vin = findKey(['vin','Vin','VIN', 'vehicle_vin'], vinVal);
      if(vin){return vin;}
      
      vin = findXpath(['VIN', 'Vin', 'vin'], vinVal);
      return vin;
    });
  } catch (e) {
    errArr.push(`vin | ${e}`);
  }

  if(!carSpecs.vin){
    throw new Error('NO VIN');
  }

  let apiVehInfo = await apiInfo(worker, carSpecs.vin);

  log({file, func, worker, message:'API Info', obj:apiVehInfo});
  
  let apiInfoKeys = Object.keys(apiVehInfo);
  for (let i = 0; i < apiInfoKeys.length; i++) {
    carSpecs[apiInfoKeys[i]] = apiVehInfo[apiInfoKeys[i]];
  }

  let dataAtt = await dataAttributes(page, worker, carSpecs.vin);

  log({file, func, worker, message:'Attribute Info', obj:dataAtt});

  let dataAttKeys = Object.keys(dataAtt);
  for (let i = 0; i < dataAttKeys.length; i++) {
    if(!carSpecs[dataAttKeys[i]]){
      carSpecs[dataAttKeys[i]] = dataAtt[dataAttKeys[i]];
    }
  }

  try {
    if(!carSpecs.title){
      carSpecs.title = await page.evaluate(() => {
        let title;
        for (let tag of document.querySelectorAll('h1')) {
          tag = tag?.innerText.replace(/\n/g,' ').replace(/\s{2,}/g, ' ').trim();
          if(/^(new|used|pre(\s|-)owned|certified|\d{4})/i.test(tag)){
            title = tag;
            break;
          }
        }
        return title || '';
      });
    }
  } catch (e) {
    errArr.push(`title | ${e}`);
  }

  try {
    if(!carSpecs.stockNo){
      carSpecs.stockNo = await page.evaluate(() => {
      let stock
        let stockVal = (s) => {
          if(!s || s.trim().length > 25){return;}
          s = s.replace(/stock(\s(no|number))?\s?#?:?/i, '').trim();
          return s.length <= 17 ? s : '';
        }
  
        stock = findKey(['stock','Stock','stock_no','stockNo','stock_number','stockNumber','StockNumber', 'vehicle_stock', 'vehicleStockNumber'], stockVal);
        if(stock){return stock;}

        stock = findXpath(['Stock No','Stock Number','Stock #', 'Stock#','Stock :','Stock:'], stockVal);
        return stock || '';
      });
    }
  } catch (e) {
    errArr.push(`stockNo | ${e}`);
  }

  try {
    if(!carSpecs.price){
      carSpecs.price = await page.evaluate(() => {
        let priceVal = (p) => {
          if(!p || p.trim().length > 20){return 0;}
          p = p.replace(/[^\d|\.]/g, '').trim();
          return (p.length <= 7 && p.length >= 3 && !(/\.\./.test(p))) ? p : 0;
        }
  
        let price = findKey(['price', 'Price', 'displayedPrice', 'vehicle_price', 'sellingprice'], priceVal);
        if(price){return price;}
  
        price = findXpath(['Sale Price', 'Internet Price', 'Price', 'price'], priceVal);
        if(price){return price;}

        price = findKey(['msrp','MSRP'], priceVal);
        return price ? price : 0;
      });
    }
  } catch (e) {
    errArr.push(`price | ${e}`);
  }

  try {
    if(!carSpecs.year){
      carSpecs.year = await page.evaluate(() => {
        let yearVal = (y) => {
          if(!y || y.trim().length > 15){return 0;}
          y = y.replace(/[^\d]/g, '').trim();
          return (/^(19|20)\d\d$/.test(y)) ? y : 0;
        }
  
        let year = findKey(['year', 'Year', 'YEAR', 'vehicle_year', 'modelYear'], yearVal);
        if(year){return year;}

        year = findXpath(['YEAR', 'Year', 'year'], yearVal);
        return year ? year : 0;
      });
    }
  } catch (e) {
    errArr.push(`year | ${e}`);
  }

  try {
    if(!carSpecs.make){
      carSpecs.make = await page.evaluate(() => {
        let makeVal = (m) => {
          if(!m || m.trim().length > 30){return '';}
          return m.replace(/[^\w|-]/g, '').trim();
        }
    
        let make = findKey(['make', 'Make', 'MAKE', 'vehicle_make'], makeVal);
        return make ? make : '';
      });
    }
  } catch (e) {
    errArr.push(`make | ${e}`);
  }

  try {
    if(!carSpecs.model){
      carSpecs.model = await page.evaluate(() => {
        let modelVal = (m) => {
          if(m){
            return m.length < 30 ? m : '';
          }
        }
        let model = findKey(['model', 'Model', 'MODEL', 'vehicle_model'], modelVal);
        return model ? model : '';
      });
    }
  } catch (e) {
    errArr.push(`model | ${e}`);
  }

  try {
    if(!carSpecs.trim){
      carSpecs.trim = await page.evaluate(() => {
        let trimVal = (t) => {
          if(t){
            return t.length < 50 ? t : '';
          }
        }
        let trim = findKey(['trim', 'Trim', 'TRIM', 'vehicle_trim'], trimVal);
        return trim ? trim : '';
      });
    }
  } catch (e) {
    errArr.push(`trim | ${e}`);
  }

  try {
    if(!carSpecs.odometer){
      carSpecs.odometer = await page.evaluate(() => {
        let odometerVal = (o) => {
          if(!o || o.trim().length > 20){return 0;}
          o = o.replace(/[^\d]/g, '').trim();
          return (o.length <= 6) ? o : 0;
        }
  
        let odometer = findKey(['mileage', 'Mileage', 'MILEAGE', 'miles', 'Miles', 'MILES', 'odometer', 'Odometer', 'ODOMETER', 'mileageFromOdometer'], odometerVal);
        if(odometer){return odometer;}
  
        odometer = findXpath(['Mileage'], odometerVal);
        return odometer ? odometer : 0;
      });
    }
  } catch (e) {
    errArr.push(`odometer | ${e}`);
  }

  try {
    if(!carSpecs.vehicleType){
      carSpecs.vehicleType = await page.evaluate(() => {
        let vehTypeVal = (v) => {
          if(v){
            return v.length < 30 ? v : '';
          }
        }
        let vType = findKey(['vehicleType'], vehTypeVal);
        return vType ? vType : '';
      });
    }
  } catch (e) {
    errArr.push(`vehicleType | ${e}`);
  }

  try {
    if(!carSpecs.bodyType){
      carSpecs.bodyType = await page.evaluate(() => {
        let bodyTypeVal = (b) => {
          let bodyTypeCheckRx = /(convertible|sedan|coupe|(sports?\s?utility vehicle|suv)|crossover|(station(\s|-))?wagon|hatch\s?back|sports? car|(pickup )?truck|(mini\s?)?van)+/i;
          if(bodyTypeCheckRx.test(b)){
            return b.match(bodyTypeCheckRx)[0];
          }
        }
  
        let bType = findKey(['body_style', 'bodyStyle', 'body_type', 'bodyType'], bodyTypeVal);
        if(bType){return bType;}
  
        bType = findXpath(['Body Type', 'Body Style'], bodyTypeVal);
        return bType ? bType : '';
      });
    }
  } catch (e) {
    errArr.push(` bodyType | ${e}`);
  }

  try {
    if(!carSpecs.drivetrain){
      carSpecs.drivetrain = await page.evaluate(() => {
        let drivetrainVal = (d) => {
          let drivetrainCheckRx = /(F|R|A|4)+WD|4(X|x)4|(Front|Rear|All|Four)+(\s|-)Wheel\sDrive/;
          return drivetrainCheckRx.test(d) ? d.match(drivetrainCheckRx)[0] : '';
        }
  
        let drivetrain = findKey(['drivetrain', 'vehicle_drivetrain'], drivetrainVal);
        if(drivetrain){return drivetrain;}
        
        drivetrain = findXpath(['Drivetrain', 'drivetrain'], drivetrainVal)
        return drivetrain ? drivetrain : '';
      });
    }
  } catch (e) {
    errArr.push(`drivetrain | ${e}`);
  }
  
  try {
    if(!carSpecs.engine){
      carSpecs.engine = await page.evaluate(() => {
        let engineVal = (e) => {
          return /electric|\d\.\dl|\b((W|VR?|I(n-?line)?)\s?-?([1-9]|1[0-6]))|(((S|s)traight\s)?([1-9]|1[0-6])\s?-?(C|c)yl(inder)?s?)/i.test(e) ? e.replace(/engine\s?:?/, '').trim() : '';
        }

        let engine = findKey(['engine', 'engineDescription', 'vehicle_engine', 'vehicleEngine'], engineVal);
        if(engine){return engine;}

        engine = findXpath(['Engine:', 'Engine :', 'engine:', 'engine :'], engineVal);
        return engine ? engine : '';
      });
    }
  } catch (e) {
    errArr.push(`engine | ${e}`)
  }

  try {
    if(!carSpecs.transmission){
      carSpecs.transmission = await page.evaluate(() => {
        let transVal = (t) => {
          let transRx = /automatic|manual/i;
          return (transRx.test(t) && t.length < 50) ? t.replace(/trans(mission)?\s?:?/, '').trim() : '';
        }

        let trans = findKey(['transmission', 'trans', 'vehicleTransmission'], transVal);
        if(trans){return trans;}

        trans = findXpath(['Transmission :', 'Transmission:', 'Trans :', 'Trans:'], transVal);
        return trans ? trans : '';
      });
    }
  } catch (e) {
    errArr.push(`transmission | ${e}`)
  }
  
  try {
    if(!carSpecs.transmisionType){
      carSpecs.transmissionType = /Auto(matic)?|A\/T/i.test(carSpecs.transmission) ? 'Automatic' : /Manual|M\/T/i.test(carSpecs.transmission) ? 'Manual' : '';
    }
  } catch (e) {
    errArr.push(`transmissionType | ${e}`);
  }

  try {
    if(!carSpecs.transmissionSpeeds){
      let transSpRx = /(Single|([1-9]|1[0-9]))\s?-?speeds?/i;
      carSpecs.transmissionSpeeds = transSpRx.test(carSpecs.transmission) ? carSpecs.transmission.match(transSpRx)[0].replace(/[^\d]/g, '').trim() : '';
    }
  } catch (e) {
    errArr.push(`transmissionSpeeds | ${e}`);
  }

  try {
    if(!carSpecs.fuelType){
      carSpecs.fuelType = await page.evaluate(() => {
        let fuelTypeVal = (f) => {
          return /Gas(oline)?/i.test(f) ? 'Gas' :  /Diesel/i.test(f) ? 'Diesel' : '';
        }
  
        let fuelType = findKey(['fuelType'], fuelTypeVal);
        return fuelType ? fuelType : '';
      });
    }
  } catch (e) {
    errArr.push(`fuelType | ${e}`);
  }

  try {
    if(!carSpecs.fuelCity){
      carSpecs.fuelCity = await page.evaluate(() => {
        let cityMPGVal = (mpg) => {
          if(!mpg || mpg.trim().length > 15){return 0;}
          mpg = +mpg.replace(/[^\d]/g, '').trim();
          return mpg ? mpg : 0;
        }
        
        let fuelCity = findKey(['cityMpg', 'cityMPG', 'epaCity', 'cityFuelEfficiency', 'cityFuelEconomy'], cityMPGVal);
        return fuelCity ? fuelCity : 0;
      });
    }
  } catch (e) {
    errArr.push(`fuelCity | ${e}`);
  }
  
  try {
    if(!carSpecs.fuelHighway){
      carSpecs.fuelHighway = await page.evaluate(() => {
        let highwayMPGVal = (mpg) => {
          if(!mpg || mpg.trim().length > 15){return 0;}
          mpg = +mpg.replace(/[^\d]/g, '').trim();
          return mpg ? mpg : 0;
        } 
        
        let fuelHighway = findKey(['highwayMpg', 'highwayMPG', 'hwyMpg', 'hwyMPG', 'epaHighway', 'highwayFuelEfficiency', 'highwayFuelEconomy'], highwayMPGVal);
        return fuelHighway ? fuelHighway : 0;
      });
    }
  } catch (e) {
    errArr.push(`fuelHighway | ${e}`);
  }

  
  try{
    if(!carSpecs.fuelCity || !carSpecs.fuelHighway) {
      let findMPG = await page.evaluate(() => {
        let mpgVal = (m) => {
          let mpgRx = /\d\d\d?\/\d\d\d?(?=(\scity\/(highway|hwy)))/i;
          return mpgRx.test(m) ? m.match(mpgRx)[0] : '';
        }

        return findXpath(['MPG', 'Fuel Economy', 'Fuel Efficiency'], mpgVal);
      });

      if(findMPG){
        carSpecs.fuelCity = +findMPG.split('/')[0] || 0;
        carSpecs.fuelHighway = +findMPG.split('/')[1] || 0;
      }
    }
  } catch (e) {
    errArr.push(`carMPG | ${e}`);
  }

  try {
    if(!carSpecs.doors){
      carSpecs.doors = await page.evaluate(() => {
        let doorVal = (d) => {
          if(!d || d.trim().length > 15){return;}
          return /[1-6]((-|\s| )?doors?)?/i.test(d) ? +d.replace(/[^\d]/g, '').trim() : 0;
        }
        
        let doors = findKey(['doors', 'numOfDoors', 'doorNumber'], doorVal);
        if(doors){return doors;}

        doors = findXpath(['Doors'], doorVal)
        return doors ? doors : 0;

      });
    }
  } catch (e) {
    errArr.push(`doors | ${e}`);
  }
  
  try {
    if(!carSpecs.interiorColor){
      carSpecs.interiorColor = await page.evaluate(() => {
        let intColVal = (i) => {
          return (i && i.length) < 40 ? i : '';
        }
        let interiorColor = findKey(['interiorColor', 'vehicle_color_int'], intColVal);
        return interiorColor || '';
      });
    }
  } catch (e) {
    errArr.push(`interiorColor | ${e}`);
  }

  try {
    if(!carSpecs.exteriorColor){
      carSpecs.exteriorColor = await page.evaluate(() => {
        let extColVal = (e) => {
          return (e && e.length < 40) ? e : '';
        }
        let exteriorColor = findKey(['exteriorColor', 'vehicle_color_ext'], extColVal);
        return exteriorColor || '';
      });
    }
  } catch (e) {
    errArr.push(`exteriorColor | ${e}`);
  }

  try {
    carSpecs.options = await page.evaluate(() => {
      let optionsArr = [];
      let optionsXPath = xSnap(`//div[contains(@id, 'Options')]/descendant::li[contains(marker, '') or contains(before, '')]`);
      if(!optionsXPath.snapshotLength){
        //template1 specific
        optionsXPath = xSnap('//li[descendant::span[contains(@class, "spec-item-description")]]');
      }
      for(let i = 0; i < optionsXPath.snapshotLength; i++){
        let opt = optionsXPath.snapshotItem(i).textContent.trim();
        if(opt){
          optionsArr.push(opt);
        }
      }
      return optionsArr.length ? optionsArr.join('|').replace(/\(STD\)\|/g, '') : '';
    })
  } catch (e) {
    errArr.push(`options | ${e}`);
  }

  try {
    carSpecs.features = await page.evaluate(() => {
      let featureSnapshotStringArr = [
        `//li[contains(@class, 'vehicle-highlights')]`,
        `//div[contains(@class, 'highlighted-features')]/descendant::li`,
        `//div[contains(@id, 'Features') or contains(@id, 'features1') or contains(@class, 'oem-specifications')]/descendant::li[contains(marker, '') or contains(before, '')]`
      ]
      let featuresArr = [];
      let featuresXPath;

      for(let featureSnapshotString of featureSnapshotStringArr){
        featuresXPath = xSnap(featureSnapshotString);
        if(featuresXPath.snapshotLength){
          for(let i = 0; i < featuresXPath.snapshotLength; i++){
            featuresArr.push(featuresXPath.snapshotItem(i).textContent.trim());
          }
          return featuresArr.join('|');
        }
      }
      return '';
    })
  } catch (e) {
    errArr.push(`features | ${e}`);
  }

  try {
    carSpecs.comments = await page.evaluate(() => {
      let commentsVal = (c) => {
        if(c){
          c = c.trim().replace(/^((vehicle\s)?description|dealer\snotes)/i, '').replace(/\n|\t|\r|<.+?>/ig, ' ').replace(/\s{2,}/g, ' ')?.trim();
          if(c.length > 20){return c;}
        }
      }

      let comments;
      
      let sellerCommentsTextArr = ['Dealer Notes', 'Dealer notes', 'VEHICLE DESCRIPTION', 'Vehicle Description', 'Vehicle description', 'Description', 'Vehicle Details'];
      for(let com of sellerCommentsTextArr){
        comments = commentsVal(xText(`//*[contains(text(), '${com}')]`));
        if(comments){return comments;}
      }
      
      for(let com of sellerCommentsTextArr){
        comments = commentsVal(xText(`//*[contains(text(), '${com}')]/parent::*`));
        if(comments){return comments;}
      }
      
      for(let com of sellerCommentsTextArr){
        let commentsSnap = xSnap(`//*[contains(text(), '${com}') and not (self::script) and not (self::style)]/parent::*`);
        for(let i = 0; i < commentsSnap.snapshotLength; i++){
          comments = commentsVal(commentsSnap.snapshotItem(i).textContent);
          if(comments){return comments;}
        }
      }

      comments = findKey(['description'], commentsVal);
      if(comments){return comments;}
      return '';
    })
  } catch (e) {
    errArr.push(`comments | ${e}`);
  }

  //If city and highway fuel efficiency wasn't set above
  if(carSpecs.comments){
    if(!carSpecs.fuelCity){
      let mpg = /\d\d\d?\/\d\d\d?\scity\/(highway|hwy)/i.test(carSpecs.comments) ? carSpecs.comments.match(/\d\d\d?\/\d\d\d?(?=(\scity\/(highway|hwy)))/i)[0] : '';
      carSpecs.fuelCity = +mpg.split('/')[0] || 0;
      carSpecs.fuelHighway = +mpg.split('/')[1] || 0;
    }
  }

  try {
    carSpecs.photos = await page.evaluate(() => {
      //***needs to be reworked to return after getting all the correct data not just when it gets the first hit
      let photoLinkCheck = (urlArr) => {
        let checkedUrlArr = [];
        urlArr = [...new Set(urlArr)];
        for(let url of urlArr){
          if(!/\.gif/.test(url)){
          url = /^http/.test(url) ? url : location.origin + url;
            checkedUrlArr.push(url);
          }
        }
        return checkedUrlArr.join('|');
      }

      // Universal pic getter
      // let getHTML = document.querySelector('html').outerHTML;
      // let picRx = /(https?:\/\/)?(\w|\.)+?(net|org|c(om?|a))(\/|\w|\.)+?\.(png|jpe?g)(\?(\w|=|&)+?)+?(?=")/ig
      // let allPicsArr = [];
      // if(picRx.test(getHTML)){
      //   allPicsArr = getHTML.match(picRx);
      //   allPicsArr = [...new Set(allPicsArr)];
      // }
      // if(allPicsArr.length){
      //   allPicsArr = [...new Set(allPicsArr)];
      //   return photoLinkCheck(allPicsArr);
      // }
    
      let photoUrlArr = [];
      let photoArr = findKey(['vdp_image_urls'], p => p);
      if(Array.isArray(photoArr) && photoArr.length){
        return photoLinkCheck(photoArr);
      }else if(photoArr?.length){
        return photoArr;
      }

      photoArr = xSnap('//div[contains(@style, "background-image:url")]');
      if (photoArr.snapshotLength) {
        for (let i = 0; i < photoArr.snapshotLength; i++) {
          photoUrlArr.push((photoArr.snapshotItem(i).getAttribute('style')).replace(/.+?background-image:\s?url\('?"?|(\?thumb)?'?"?\);?/g, ''));
        }
        return photoLinkCheck(photoUrlArr);
      }
      
      let findPhotosArr = [
        '//div/@data-background-image[ancestor::*/@class[contains(., "slider")]]'
        ,'//meta[contains(@itemprop, "image")]/@content[ancestor::*/@class[contains(., "carousel")]]'
        ,'//img/@data-src[ancestor::*/@class[contains(., "carousel")]]'
        ,'//img/@src[ancestor::*/@class[contains(., "carousel")]]'
        ,'//img/@data-error_image'
      ]

      for(let findPhotosString of findPhotosArr){
        photoArr = xSnap(findPhotosString);
        if (photoArr.snapshotLength) {
          for (let i = 0; i < photoArr.snapshotLength; i++) {
            photoUrlArr.push(photoArr.snapshotItem(i).textContent);
          }
          return photoLinkCheck(photoUrlArr);
        }
      }
      return '';
    })
  } catch (e) {
    errArr.push(`photos | ${e}`);
  }

  carSpecs.featuredPhoto = carSpecs.photos ? carSpecs.photos.split('|')[0] : '';

  try {
    if(!carSpecs.isCertified){
      carSpecs.isCertified = await page.evaluate(() => {
        let certifiedVal = (cert) => {
          return (cert == true || cert === 'true' || cert === 'True') ? 1 : 0;
        }
  
        let certified = findKey(['cpo', 'isDealerCertified'], certifiedVal);
        return certified ? certified : 0;
      });
    }
  } catch (e) {
    errArr.push(`isCertified | ${e}`);
  }

  try {
    if(!carSpecs.inventoryType){
      carSpecs.inventoryType = /\/used/i.test(carSpecs.url) ? 'USED' : /\/new/i.test(carSpecs.url) ? 'NEW' : '';
    }
  } catch (e) {
    errArr.push(`inventoryType | ${e}`);
  }

  return {carSpecs, errArr};
}