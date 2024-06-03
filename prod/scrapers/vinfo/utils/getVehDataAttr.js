let { log, devLog } = require('../../template/logger.js');

module.exports = async (page, worker, vin) => {
  devLog(worker, 'getVehDataAttr.js', 'getVehDataAttr', 'Start');
  let getAttr = async (attr) => {
    try {
      return await page.evaluate((attr, vin) => {
        let attribute = document.querySelector(`[data-${attr}]:not([data-${attr}=""])[data-vin="${vin}"]`);
        console.log(attribute);
        return attribute ? attribute.getAttribute(`data-${attr}`) : '';
      }, attr, vin);
    } catch (e) {
      devLog(worker, 'getVehDataAttr.js', 'getAtt', `FAIL | Error getting data attribute ${attr}`, e);
      return '';
    }
  }
  
  return {
    title:await getAttr('name'),
    stockNo:await getAttr('stocknum'),
    price:+(await getAttr('price')) || 0,
    year:+(await getAttr('year')) || 0,
    make:await getAttr('make'),
    model:await getAttr('model'),
    trim:await getAttr('trim'),
    engine:await getAttr('engine'),
    transmission:await getAttr('trans'),
    fuelType:await getAttr('fuelType'),
    fuelCity:+(await getAttr('mpgcity')) || 0,
    fuelHighway:+(await getAttr('mpghwy')) || 0,
    bodyType:await getAttr('bodystyle'),
    exteriorColor:await getAttr('extcolor'),
    interiorColor:await getAttr('intcolor'),
    inventoryType:await getAttr('vehicletype'),
    isCertified:+(await getAttr('cpo')) || 0
  };
}