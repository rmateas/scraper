import { setTimeout } from 'node:timers/promises';

import { log } from './logger/logger.js';

const file = 'apiUtils.js';

const getAPI = async (worker, path) => {
  log({file, func:'getAPI', worker, message:`GETTING FROM: ${path}`});
  let info;
  try {
    info = await (await fetch(path)).json();
    if(info.status != 'success') {
      log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | ${info.message}`, error:info.stack});
      // ASSIGN EXIT CODE
      process.exit()
    } else if(info.status == 'success' && !info.data.length){
      log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | NO API DATA`});
      process.exit(8000);
    }
  } catch (error) {
    log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | GET | Error fetching from API`, error});
    // ASSIGN EXIT CODE
    process.exit()
  }
  return info.data;
}

const postAPI = async (worker, path, info) => {
  log({file, func:'postAPI', worker, message:`POSTING TO: ${path}`});
  try {
    await fetch(path, {
      method:'POST',
      body:info,
      headers:{
        'Content-type': 'application/json; charset=UTF-8'
      }
    });
  } catch (error) {
    log({level:'error', file, func:'postAPI', worker, message:`FAIL | API ERROR | POST`, error});
    await setTimeout(5000);
    await postAPI(path, info);
  }
}

export { getAPI, postAPI }