const fetch = require('node-fetch-commonjs');
const {log, devLog} = require('../../template/logger.js');

let APIInfo = async (worker, vin) => {
  devLog(worker, 'getVehicleInfoApi.js', 'APIInfo', 'Start');
  let data = {};
  
  try {
    let apiData = await (await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinextended/${vin}?format=json`)).json();
    for(let infoObj of apiData.Results){
      data[infoObj.Variable.replace(/\s/g, '_')] = infoObj.Value;
    }
  } catch (e) {
    log(worker, 'getVehicleInfoApi.js', 'APIInfo', `Error getting VIN API data: ${vin}`, e);
    return {};
  }

  let checkData = (key) => key in data && data[key] != null && data[key] != "null"  && !(/\//.test(data[key])) ? data[key] : ''; 

  let drivetrainCheckRx = /(F|R|A|4)WD|4(X|x)4|(Front|Rear|All|Four)\sWheel\sDrive/;
  
  return {
    vin,
    year:checkData('Model_Year'),
    make:checkData('Make'),
    model:checkData('Model'),
    trim:checkData('Trim') ? checkData('Trim2') ? `${checkData('Trim')} ${checkData('Trim2')}` : checkData('Trim') : checkData('Series') ? checkData('Series2') ? `${checkData('Series')} ${checkData('Series2')}` : checkData('Series') : '',
    vehicleType:checkData('Vehicle_Type'),
    bodyType:checkData('Body_Class'),
    drivetrain:drivetrainCheckRx.test(checkData('Drive_Type')) ?  drivetrain.match(drivetrainCheckRx)[0] : '',
    fuelType:/Gas(oline)?|flex\s?fuel/i.test(checkData('Fuel_Type_-_Primary')) ? 'Gas' : /Diesel/i.test(checkData('Fuel_Type_-_Primary')) ? 'Diesel' : '',
    transmissionType:checkData('Transmission_Style'),
    transmissionSpeeds:checkData('Transmission_Speeds'),
    doors:checkData('Doors')
  }
};

module.exports = APIInfo;