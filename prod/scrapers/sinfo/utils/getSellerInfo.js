const { log, devLog } = require('../template/logger.js');

module.exports = async (page, worker) => {
  devLog(worker, 'getSellerInfo.js', 'getSellerInfo', 'Getting seller info');
  return await page.evaluate(() => {
    //SELLER NAME

    let sellerName = findKey(['dealershipName', 'name']);

    //SELLER STREET

    let sellerStreet = findKey(['streetAddress', 'address1']);
    let address2 = findKey(['address2']);
    if(address2){
      sellerStreet = `${sellerStreet} ${address2}`
    }

    //SELLER CITY

    let sellerCity = findKey(['addressLocality', 'city']);

    //SELLER STATE

    let sellerState = findKey(['addressRegion', 'stateProvince']);

    //SELLER ZIP

    let sellerZip = findKey(['postalCode']);

    //SELLER COUNTRY

    let sellerCountry = findKey(['addressCountry', 'country']);
    if(!sellerCountry && sellerZip){
      sellerCountry = /\d{5}/.test(sellerZip) ? 'US' : 'CA'; 
    }

    //SELLER LATITUDE

    let sellerLatitude = findKey(['latitude']);
    if(!/\d\.\d/.test(sellerLatitude)){
      sellerLatitude = findKey(['userLatitude']);
    }

    //SELLER LONGITUDE

    let sellerLongitude = findKey(['longitude']);
    if(!/\d\.\d/.test(sellerLongitude)){
      sellerLongitude = findKey(['userLongitude']);
    }

    //SELLER PHONE

    let sellerPhone = findKey(['telephone', 'phone1']);
    sellerPhone = /\(?\d\d\d\)?(\s|-)\d\d\d(\s|-)\d\d\d\d/.test(sellerPhone) ? sellerPhone.match(/\(?\d\d\d\)?(\s|-)\d\d\d(\s|-)\d\d\d\d/)[0] : sellerPhone;

    //SELLER EMAIL

    let sellerEmail = findKey(['email']);

    //SELLER TYPE

    let sellerType = 'DEALER';

    //CURRENCY DENOMINATION

    let currencyDenomination = 'USD';
    if(/can?d?/i.test(sellerCountry)){
      currencyDenomination = 'CAD';
    }

    return {
      sellerName,
      sellerPhone,
      sellerEmail,
      sellerStreet,
      sellerCity,
      sellerState,
      sellerZip,
      sellerCountry,
      sellerLatitude,
      sellerLongitude,
      sellerType,
      currencyDenomination
    };
  });
}