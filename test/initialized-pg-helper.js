/**
 * Created by zhongzhengkai on 2016/12/5.
 */

var pgHelper = require('../../pg-cli');

var conf = {
  user: 'financeuser',
  //user: 'postgres',
  database: 'finance',
  password: 'financeuserpwd',
  host:'localhost',
  port: 5432,
  max: 10, // max number of clients in pool
  min: 4,
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
};

pgHelper.initPool(conf);

module.exports = pgHelper;
