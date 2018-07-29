var core = require('./core');
var DEFAULT_DB_NAME = 'default';
var extractRows = require('./util').extractRows;
var extractDbName = require('./util').extractDbName;
var DEFAULT_DB_NAME = require('./util').DEFAULT_DB_NAME;

exports.initPool = function (config, poolKeyAlias, customizeConfig) {
  if (!poolKeyAlias) poolKeyAlias = DEFAULT_DB_NAME;
  core.initPool(config, poolKeyAlias, customizeConfig);
}

exports.select = function (tableName, options) {
  return function (cb) {
    core.select(extractDbName(options), tableName, options, extractRows(options, cb));
  }
}

exports.insert = function (tableName, toInsert, options) {
  return function (cb) {
    core.insert(extractDbName(options), tableName, toInsert, options, extractRows(options, cb));
  }
}

exports.insertBatch = function (tableName, toInserts, options) {
  return function (cb) {
    core.insertBatch(extractDbName(options), tableName, toInserts, options, extractRows(options, cb));
  }
}

exports.update = function (tableName, toUpdate, options) {
  return function (cb) {
    core.update(extractDbName(options), tableName, toUpdate, options, extractRows(options, cb));
  }
}

exports.updateBatch = function (tableName, toUpdates, options) {
  return function (cb) {
    core.updateBatch(extractDbName(options), tableName, toUpdates, options, extractRows(options, cb));
  }
}

exports.delete = function (tableName, options) {
  return function (cb) {
    core.delete(extractDbName(options), tableName, options, extractRows(options, cb));
  }
}

exports.startTransaction = function (fn, dbName) {
  return function (cb) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.startTransaction(dbName, fn, cb);
  }
}

/**
 * @description
 * @param {*} fn
 * @param {Array<String>} ?dbNames
 * @returns
 */
exports.startMultiDbTransaction = function (fn, dbNames) {
  return function (cb) {
    if (!dbNames) dbNames = core.getDbNameList();
    core.startMultiDbTransaction(dbNames, fn, cb);
  }
}

exports.queryWithTransaction = function (queryObjectList, dbName) {
  return function (cb) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.queryWithTransaction(dbName, queryObjectList, cb);
  }
}

exports.query = function (sql, args, options) {
  return function (cb) {
    core.query(extractDbName(options), sql, args, extractClient(options), cb);
  }
}

exports.acquireDbClient = function (dbName) {
  return function (cb) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.acquireDbClient(dbName, cb);
  }
}
