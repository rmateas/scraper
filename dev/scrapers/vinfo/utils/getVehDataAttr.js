import log from '../../../utils/logger/logger.js';

const file ='getVehDataAttr.js';
const func ='default';

export default async (page, worker, vin) => {
  log({file, func, worker, message:'START'});
  let getAttr = async (attr) => {
    try {
      return await page.evaluate((attr, vin) => {
        let attribute = document.querySelector(`[data-${attr}]:not([data-${attr}=""])[data-vin="${vin}"]`);
        return attribute ? attribute.getAttribute(`data-${attr}`) : '';
      }, attr, vin);
    } catch (error) {
      log({file, func, worker, message:`FAIL | Error getting data attribute ${attr}`, error});
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