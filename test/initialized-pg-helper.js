/**
 * Created by zhongzhengkai on 2016/12/5.
 */

var api = require('../lib/api');
var apiPromise = require('../lib/api-promise');

var conf1 = {
  user: 'financeuser',
  password: 'financeuserpwd',
  host:'localhost',
  port: 5432,
  database: 'zzk',
  max: 10, // max number of clients in pool
  min: 4,
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
};
var conf2 = {
  user: 'financeuser',
  password: 'financeuserpwd',
  host:'localhost',
  port: 5432,
  database: 'game',
  max: 10, // max number of clients in pool
  min: 4,
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
};
var customizeConf = {
  sqlWatcher(dbName, sql, args){
    console.log(dbName, sql, args);
  },
  printTransactionProcess: true,
};

api.initPool(conf1, null, customizeConf);
api.initPool(conf2, 'game', customizeConf);
console.log('------- init conf ------');
console.log(JSON.stringify(conf1, null, 2));
console.log(JSON.stringify(conf2, null, 2));

module.exports = {
  api,
  apiPromise,
};
