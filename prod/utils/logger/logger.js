import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, appendFileSync, createReadStream } from 'fs';

import chalk from 'chalk';
import moment from 'moment';

import config from './config.js';

//Needed to make __dirname for absolute path work
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main Logging Function
 * @param {object} options 
 * OBJECT { level, message, error }
 */

export const log = (options) => {
  const levelName = getLevelName(options.level);
  let message = options.message ?? 'Unidentified Error';
  const error = options.err ?? null;

  //Always log to the console
  writeToConsole(levelName, message, error);

  if(config.levels[levelName].writeToDB){
    writeToDB(levelName, message);
  }

}

/**
 * Write formatted message to the console
 * @param {string} levelName 
 * @param {string} message 
 * @param {Error|null} error 
 */
const writeToConsole = (levelName, message, error = null) => {

  const level = config.levels[levelName];
  let chalkFunction = level.color.includes('#') ? chalk.hex(level.color)
    : Array.isArray(level.color) ? chalk.rgb(level.color[0], level.color[1], level.color[2])
    : chalk[level.color];

  message = error ? `${chalkFunction(`${error.message} \n ${error.stack}`)}` : message;
  const header = `[${levelName.toUpperCase()}][${getFormattedCurrentDate()}]`;

  console.log(`${chalkFunction(header)}: ${chalkFunction(message)}`);
}

/**
 * Write the formatted message to a file
 * @param {string} level
 * @param {string} message 
 */
const writeToDB = (level, message) => {

  console.log('write to db');
  // const logsDir = `${__dirname}/logs`;

  // const data = `{"level": "${level.toUpperCase()}", "message": "${message}"}, "timestamp": "${getFormattedCurrentDate()}"\r\n`;

  // if(!existsSync(logsDir)){
  //   mkdirSync(logsDir)
  // }

  // const options = {
  //   encoding: 'utf8',
  //   mode: 438
  // }

  // appendFileSync(`${logsDir}/${level}.log`, data, options);
}

/**
 * Read data from a log
 * @param {string} fileName
 * @return Promise 
 */
export  const readLog = async (fileName = null) => {
  const logsDir = `${__dirname}/logs`;

  return new Promise((resolve, reject) => {
    const file = path.join(logsDir, fileName.includes('.') ? fileName : `${fileName}.log`);
    const lineReader = readline.createInterface({
      input: createReadStream(file)
    });

    const logs = [];

    lineReader.on('line', (line) => {
      logs.push(JSON.parse(line))
    });

    lineReader.on('close', () => {
      console.log(chalk.yellow(`${fileName.toUpperCase} Logs have been accessed`));
      console.table(logs);
      resolve(logs);
    });

    lineReader.on('error', (error) => {
      reject(error)
    })

  });
}

/**
 * Get level name
 * @param {string} level 
 * @returns string
 */
const getLevelName = level => level && config.levels.hasOwnProperty(level) ? level : 'info';

/**
 * Get formatted date
 * @returns string
 */
const getFormattedCurrentDate = () => moment(new Date()).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS);

/**
 * Helper function for printing ACCESS level logs
 * @param {string} message 
 */
export const access = (message) => {
  log({level:'access', message});
}

/**
 * Helper function for printing WARN level logs
 * @param {string} message 
 */
export const warn = (message) => {
  log({level:'warn', message});
}

/**
 * Helper function for printing DEBUG level logs
 * @param {string} message 
 */
export const debug = (message) => {
  log({level:'debug', message});
}

/**
 * Helper function for printing SYSTEM level logs
 * @param {string} message 
 */
export const system = (message) => {
  log({level:'system', message});
}

/**
 * Helper function for printing DATABASE level logs
 * @param {string} message 
 */
export const database = (message) => {
  log({level:'database', message});
}

/**
 * Helper function for printing event level logs
 * @param {string} message 
 */
export const event = (message) => {
  log({level:'event', message});
}

/**
 * Helper function for printing INFO level logs
 * @param {string} message 
 */
export const info = (message) => {
  log({level:'info', message});
}

/**
 * Helper function for printing ERROR level logs
 * @param {string} message 
 */
export const error = (error) => {

  if(typeof error === 'string'){
    log({level:'error', message:error});
  } else {
    log({level:'error', error});
  }


}

/**
 * Helper function for printing FATAL level logs
 * @param {string} message 
 */
export const fatal = (error) => {

  if(typeof error === 'string'){
    log({level:'fatal', message:error});
  } else {
    log({level:'fatal', error})
  }
}



log({message:'Hello World'});























// import readline from 'readline';

// import Table from 'cli-table3';


// // instantiate
// let table = new Table({
//   head: ['TH 1 label', 'TH 2 label']
// , colWidths: [100, 100]
// });

// // table is an Array, so you can `push`, `unshift`, `splice` and friends
// table.push(
//   ['First value', 'Second value']
// , ['First value', 'Second value']
// );

// setInterval(() => {
//   readline.cursorTo(process.stdout, -1);
//   process.stdout.write(table.toString())
// }, 1000)









// const { Console } = require("console");
// const console = new Console(process.write);

// import { Console } from 'node:console'
// import { Transform } from 'node:stream'

// const ts = new Transform({ transform(chunk, enc, cb) { cb(null, chunk) } })
// const log = new Console({ stdout: ts })

// let getTable = (data) => {
//   log.table(data);
//   return (ts.read() || '').toString();
// }

// // const str = getTable([{foo: 'bar'}, {foo:'baz'}])

// // process.stdout.write(str)

// let logTable = [];
// let printTable;

// const initializeLogger = (workers) => {
//   for(let i = 0; i < workers; i++){
//     logTable.push({worker:i, time:new Date(), browser:'', fileName:'logger.js', func:'initializeLogger', url:'', message:'Initialized'});
//   }
//   setInterval(() => {
//     printLog();
//   }, 1000)
// }

// const logger = (worker, info) => {
//   for(let key of info){
//     logTable[worker][key.value] = key.data;
//   }
//   logTable[worker].time = new Date();
//   printTable = getTable(logTable);
// }

// const printLog = () => {
//   process.stdout.write(printTable);
// }

// export { initializeLogger, logger };


// console.group

// setInterval(() => process.stdout.write(`clock: ${new Date()}\r`), 1000);
// import readline from 'readline';
// var totalTime = 5000;
// var waitInterval = totalTime / 10;
// var currentInterval = 0;

// function writeWaitingPercent(p) {
//   //readline.clearLine(process.stdout);
//   readline.cursorTo(process.stdout, 0);
//   process.stdout.write(`waiting ... ${p}%`);
// }

// var interval = setInterval(function(){
//     currentInterval += waitInterval
//     writeWaitingPercent((currentInterval / totalTime) * 100)
// }, waitInterval)

// setTimeout(function(){
//     clearInterval(interval)
// }, totalTime + 100)











///////old logger

// let addPadding = padStr => padStr.padStart(padStr.length + Math.floor((20 - padStr.length)/2)).padEnd(padStr.length + (20 - padStr.length));

// let getCol = (w) => {
//   let txtCol = w;
//   let bg = 0;

//   let remainder = w%7;
//   let div = Math.floor(w/7);

//   if(w > 7){
//     bg = div;
//     txtCol = remainder;
//     if(remainder >= div){
//       remainder++;
//       bg = div;
//       txtCol = remainder;
//       if(remainder > 7){
//         bg = div++;
//         txtCol = 0;
//       }
//     }
//   }
//   return {txtCol, bg};
// }

// let log = (worker, file, funcName, message, obj = '') => {
//   let {txtCol, bg} = getCol(worker);
//   if(worker == 0) {
//     console.log(`\x1b[30m\x1b[45m Worker : ${worker} | ${new Date().toISOString()} |${addPadding(file)}|${addPadding(funcName)}| ${message}${obj?'\n':''}`, obj);
//   } else {
//     console.log(`\x1b[3${txtCol}m\x1b[4${bg}m Worker : ${worker} | ${new Date().toISOString()} |${addPadding(file)}|${addPadding(funcName)}| ${message}${obj?'\n':''}`, obj);
//   }
// }

// let devLog = (worker, file, funcName, message, obj = '') => {
//   if(process.env.DEBUG !== "false"){
//     let {txtCol, bg} = getCol(worker);
//     if(worker == 0) {
//       console.log(`\x1b[30m\x1b[45m Worker : ${worker} | ${new Date().toISOString()} |${addPadding(file)}|${addPadding(funcName)}| ${message}${obj?'\n':''}`, obj);
//     } else {
//       console.log(`\x1b[3${txtCol}m\x1b[4${bg}m Worker : ${worker} | ${new Date().toISOString()} |${addPadding(file)}|${addPadding(funcName)}| ${message}${obj?'\n':''}`, obj);
//     }
//   }
// }

// module.exports = {log, devLog};

//console.log(`\x1b[31m\x1b[47m Example`)

// Text Color
// \x1b[30m : Black
// \x1b[31m : Red
// \x1b[32m : Green
// \x1b[33m : Yellow
// \x1b[34m : Blue
// \x1b[35m : Purple
// \x1b[36m : Cyan
// \x1b[37m : White

// Background Color
// \x1b[40m : Black
// \x1b[41m : Red
// \x1b[42m : Green
// \x1b[43m : Yellow
// \x1b[44m : Blue
// \x1b[45m : Purple
// \x1b[46m : Cyan
// \x1b[47m : White