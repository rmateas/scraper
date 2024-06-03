const $sel = (selector) => document.querySelector(selector);
const $$sel = (selector) => [...document.querySelectorAll(selector)];
const xText = (xString) => document.evaluate(xString.replace(/\)\]/, ') and not (self::script) and not (self::style)]'), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent.trim() || null;
const xSnap = (xString) => document.evaluate(xString, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null) || null;

let validation = (val) => {
  return (val && !(val === 'null') && !(val === 'undefined') && !(val === '0')) ? val : ''; 
}

let findKey = (keyArr, val = validation) => {
  let keysArr = [];
  for(let key of keyArr){
    let keyXPathSnap = xSnap(`//script[contains(., '"${key}":') or contains(., '"${key}" :') ]`);
    for(let i = 0; i < keyXPathSnap.snapshotLength; i++){
      let keyRx = new RegExp(`(?<="${key}")\s?:( |\s)?"(.|\s)+?"`);
      let keySnap = keyXPathSnap.snapshotItem(i).textContent.replace(/\n/g,' ').replace(/\s{2,}/g, ' ');
      if(keyRx.test(keySnap)){
        let keyObj = keySnap.match(keyRx)[0].replace(/:|"/g, '').replace(/\s{2,}/, ' ').replace(new RegExp(`${key}`), '').trim();
        //correct escaped encoding (http\\x3a\\x2f\\x2fwww.url.com) << this stuff
        if(/\\x\d\d/.test(keyObj)){
          keyObj = keyObj.replace(/([^\\]|^)\\x/g, '$1\\u00');
        }
        if(!/\{|\}|\[|\]/.test(keyObj)){
          keyObj = val(validation(keyObj));
          if(keyObj){
            keysArr.push(keyObj);
          }
        }
      }
    }
  }
  return keysArr.length ? keysArr.sort((a,b) => keysArr.filter(v => v===a).length - keysArr.filter(v => v===b).length).pop() : undefined;
}

let findXpath = (xpath, val) => {
  for(let x of xpath){
    let foundX = val(validation(xText(`//*[contains(text(), "${x}")]`)));
    if(foundX){return foundX;}
  }
  
  for(let x of xpath){
    let foundX = val(validation(xText(`//*[contains(text(), "${x}")]/following-sibling::*`)));
    if(foundX){return foundX;}
  }
  
  for(let x of xpath){
    let foundX = val(validation(xText(`//*[contains(text(), "${x}")]/parent::*`)));
    if(foundX){return foundX;}
  }
  
  for(let x of xpath){
    let foundX = xText(`//script[contains(text(), "${x}")]`);
    let foundXRx = new RegExp(`"${x}.+?"`)
    foundX = foundXRx.test(foundX) ? val(validation(foundX.match(foundXRx)[0].replace(/"/g, '').replace(x, '').trim())) : '';
    if(foundX){return foundX;}  
  }

  for(let x of xpath){
    let foundX = xText(`//script[contains(text(), "${x}: '") or contains(text(), "${x}:'")]`);
    let foundXRx = new RegExp(`(?<=${x})(\s| )?:(\s| )?'.+?'`)
    foundX = foundXRx.test(foundX) ? val(validation(foundX.match(foundXRx)[0].replace(/'|:/g, '').trim())) : '';
    if(foundX){return foundX;}
  }

  return undefined;
}
// const findKey = (keyArr) => {
//   let foundKey;
//   let keyObj;
//   let keyXPathSnap;
//   let keyRx;
//   let keysArr = [];
//   for(let key of keyArr){
//     //convert to parseable object
//     keyXPathSnap = xSnap(`//script[contains(., '"${key}"')]`);
//     for(let i = 0; i < keyXPathSnap.snapshotLength; i++){
//       keyRx = new RegExp(`\{(([^\{])+)?"${key}"(.|\s)+?(\{|\})`);
//       let keySnap = keyXPathSnap.snapshotItem(i).textContent.replace(/\n/g,'');
//       if(keyRx.test(keySnap)){
//         keyObj = keySnap.match(keyRx)[0];
//       } else {
//         continue;
//       }
//       if((new RegExp(`\{.+?\}.+?"${key}"`)).test(keyObj)){
//         keyObj = keyObj.replace(/\{.+?\}(.+?)?,/, '{');
//       } 
//       if(/\{$/.test(keyObj)){
//         keyObj = keyObj.replace(/\[?\s?\{$/, '""}');
//       }
//       //correct escaped encoding (http\\x3a\\x2f\\x2fwww.url.com) << this stuff
//       if(/\\x\d\d/.test(keyObj)){
//         keyObj = keyObj.replace(/([^\\]|^)\\x/g, '$1\\u00');
//       }
//       try {
//         keyObj = JSON.parse(keyObj);
//         foundKey = keyObj[key].toString().trim();
//         if(foundKey){
//           keysArr.push(foundKey);
//         } else {
//           continue;
//         }
//       } catch (e) {
//         continue;
//       }
//     }
//   }
//   return keysArr.sort((a,b) =>
//     keysArr.filter(v => v===a).length
//     - keysArr.filter(v => v===b).length
//   ).pop();
// }