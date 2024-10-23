import fs from 'fs';

import { setTimeout } from 'node:timers/promises';



import log from './logger/logger.js';

const file = 'apiUtils.js';

const getAPI = async (worker, path) => {
  log({file, func:'getAPI', worker, message:`GETTING FROM: ${path}`});
  let info;
  try {
    info = await (await fetch(path)).json();
    if(info.message != 'SUCCESS') {
      await log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | ${info.message}`});
      // ASSIGN EXIT CODE
      process.exit()
    } else if(info.message == 'SUCCESS' && !info.data.length){
      await log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | NO API DATA`});
      process.exit(8000);
    }
  } catch (error) {
    await log({level:'error', file, func:'getAPI', worker, message:`FAIL | API ERROR | GET | Error fetching from API`, error});
    // ASSIGN EXIT CODE
    process.exit();
  }
  return info.data;
}

const postAPI = async (worker, path, info, attempt=0) => {
  log({file, func:'postAPI', worker, message:`POSTING TO: ${path}`});
  let content = {
    method: "POST",
    body: info,
    headers: { "Content-type": "application/json; charset=UTF-8" }
  };

  if(attempt > 1){
    fs.appendFileSync('./waitingForDB.json', JSON.stringify({path, content}))
    return;
  }
  
  try {
    await fetch(path, content);
  } catch (error) {
    await log({level:'warn', file, func:'postAPI', worker, message:`FAIL | API ERROR | POST`, error});
    await setTimeout(5000);
    await postAPI(worker, path, info, attempt+1);
  }
  
}

export { getAPI, postAPI }