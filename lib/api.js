var core = require('./core');
var util = require('./util');
var extractRows = util.extractRows;
var extractDbName = util.extractDbName;
var extractClient = util.extractClient;
var DEFAULT_DB_NAME = util.DEFAULT_DB_NAME;

// 动态注入对IDE不友好，放弃该写法
// var noNeedInjectDbNameMethods = ['queryOnce', 'initPool'];
// var slice = Array.prototype.slice;
// var methods = Object.keys(core);
// methods.forEach(methodName => {
//   exports[methodName] = function () {
//     var fn = core[methodName];
//     if (noNeedInjectDbNameMethods.indexOf(methodName) == -1) {
//       var args = slice.call(arguments);
//       args.unshift(DEFAULT_DB_NAME);
//       fn.apply(this, args);
//     } else {
//       fn.apply(this, arguments);
//     }
//   }
// });

exports.initPool = function (config, alias, customizeConfig) {
  if (!alias) alias = DEFAULT_DB_NAME;
  core.initPool(config, alias, customizeConfig);
}

exports.select = function (tableName, options, cb) {
  core.select(extractDbName(options), tableName, options, extractRows(options, cb));
}

exports.insert = function (tableName, toInsert, options, cb) {
  core.insert(extractDbName(options), tableName, toInsert, options, extractRows(options, cb));
}

exports.insertBatch = function (tableName, toInserts, options, cb) {
  core.insertBatch(extractDbName(options), tableName, toInserts, options, extractRows(options, cb));
}

exports.update = function (tableName, toUpdate, options, cb) {
  core.update(extractDbName(options), tableName, toUpdate, options, extractRows(options, cb));
}

exports.updateBatch = function (tableName, toUpdates, options, cb) {
  core.updateBatch(extractDbName(options), tableName, toUpdates, options, extractRows(options, cb));
}

exports.delete = function (tableName, options, cb) {
  core.delete(extractDbName(options), tableName, options, extractRows(options, cb));
}

exports.startTransaction = function (fn, dbName, cb) {
  if (typeof dbName == 'function') {//兼容第二位参数直接传回调
    var curCb = dbName;
    core.startTransaction(DEFAULT_DB_NAME, fn, curCb);
  } else {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.startTransaction(dbName, fn, cb);
  }
}

/**
 * @description 第二位参数传递callback，默认获取所有映射好的数据连接池对象Map
 * @param {*} fn
 * @param {*} dbNames
 * @param {*} cb
 */
exports.startMultiDbTransaction = function (fn, dbNames, cb) {
  if (typeof dbNames == 'function') {
    var curCb = dbNames;
    core.startMultiDbTransaction(core.getDbNameList(), fn, curCb);
  } else {
    core.startMultiDbTransaction(dbNames, fn, cb);
  }
}

exports.queryWithTransaction = function (queryObjectList, dbName, cb) {
  if (typeof dbName == 'function') {//兼容第二位参数直接传回调
    var curCb = dbName;
    core.queryWithTransaction(DEFAULT_DB_NAME, queryObjectList, curCb);
  } else {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.queryWithTransaction(dbName, queryObjectList, cb);
  }
}

exports.query = function (sql, args, options, cb) {
  if (typeof options == 'function') {
    var curCb = options;
    core.query(DEFAULT_DB_NAME, sql, args, null, extractRows(null, curCb));
  } else {
    core.query(extractDbName(options), sql, args, extractClient(options), extractRows(options, cb));
  }
}

exports.acquireDbClient = function (dbName, cb) {
  if (typeof dbName == 'function') {//兼容第一位参数直接传回调
    var curCb = dbName;
    core.acquireDbClient(DEFAULT_DB_NAME, curCb);
  } else {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.acquireDbClient(dbName, cb);
  }
}

