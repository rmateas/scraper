import { setTimeout } from 'node:timers/promises';

const getAPI = async (path) => {
  let info;
  try {
    info = await (await fetch(path)).json();
    if(info.status != 'success') {
      throw new Error('FAIL | API ERROR | API returned with error status');
    } else if(info.status == 'success' && !info.data.length){
      process.exit(8000);
    }
  } catch (e) {
    throw new Error('FAIL | API ERROR | Error fetching from API');
  }
  return info.data;
}

const postAPI = async (path, info) => {
  try {
    await fetch(path, {
      method:'POST',
      body:info,
      headers:{
        'Content-type': 'application/json; charset=UTF-8'
      }
    });
  } catch (e) {
    await setTimeout(5000);
    await postAPI(path, info);
  }
}

export { getAPI, postAPI }