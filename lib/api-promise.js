var core = require('./core');
var DEFAULT_DB_NAME = 'default';
var extractRowsForPromise = require('./util').extractRowsForPromise;
var extractDbName = require('./util').extractDbName;
var DEFAULT_DB_NAME = require('./util').DEFAULT_DB_NAME;

exports.initPool = function (config, poolKeyAlias, customizeConfig) {
  if (!poolKeyAlias) poolKeyAlias = DEFAULT_DB_NAME;
  core.initPool(config, poolKeyAlias, customizeConfig);
}

/**
 * @description
 * @param {*} tableName
 * @param {Object} options
 * @param {Object} options.filter
 * @param {String} options.db
 * @param {Array<String>} options.fields
 * @returns
 */
exports.select = function (tableName, options) {
  return new Promise(function (resolve, reject) {
    core.select(extractDbName(options), tableName, options, extractRowsForPromise(resolve, reject, options));
  });
}

/**
 * @description
 * @param {*} tableName
 * @param {*} toInsert
 * @param {Object} options
 * @param {Array<String>} options.fields
 * @returns
 */
exports.insert = function (tableName, toInsert, options) {
  return new Promise(function (resolve, reject) {
    core.insert(extractDbName(options), tableName, toInsert, options, extractRowsForPromise(resolve, reject, options));
  });
}

exports.insertBatch = function (tableName, toInserts, options) {
  return new Promise(function (resolve, reject) {
    core.insertBatch(extractDbName(options), tableName, toInserts, options, extractRowsForPromise(resolve, reject, options));
  });
}

exports.update = function (tableName, toUpdate, options) {
  return new Promise(function (resolve, reject) {
    core.update(extractDbName(options), tableName, toUpdate, options, extractRowsForPromise(resolve, reject, options));
  });
}

/**
 * @description
 * @param {*} tableName
 * @param {*} toUpdates
 * @param {Object} options
 * @param {String} options.filterKey
 * @param {Array<String>} options.fields
 * @returns
 */
exports.updateBatch = function (tableName, toUpdates, options) {
  return new Promise(function (resolve, reject) {
    core.updateBatch(extractDbName(options), tableName, toUpdates, options, extractRowsForPromise(resolve, reject, options));
  });
}

/**
 * @description
 * @param {*} tableName
 * @param {Object} options
 * @param {Object} options.filter
 * @returns
 */
exports.delete = function (tableName, options) {
  return new Promise(function (resolve, reject) {
    core.delete(extractDbName(options), tableName, options, extractRowsForPromise(resolve, reject, options));
  });
}

exports.startTransaction = function (fn, dbName) {
  return new Promise(function (resolve, reject) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.startTransaction(dbName, fn, function (err, result) {
      err ? reject(err) : resolve(result);
    });
  });
}

/**
 * @description
 * @param {*} fn
 * @param {Array<String>} ?dbNames
 * @returns
 */
exports.startMultiDbTransaction = function (fn, dbNames) {
  return new Promise(function (resolve, reject) {
    if (!dbNames) dbNames = core.getDbNameList();
    core.startMultiDbTransaction(dbNames, fn, function (err, result) {
      err ? reject(err) : resolve(result);
    });
  });
}

/**
 * @description 执行事务性的一组操作，推荐使用startTransaction替代，可以更方便的复用api
 * @param {Array} queryObjectList 
 * 查询对象形如以下示例,key用于记录返回的结果,:
 * {cmd:'select',table:'company',filter:{...},fields?:[],key:'sel'}
 * {cmd:'insert',table:'company',data:{...},fields?:[],key:'ins'}
 * {cmd:'insertBatch',table:'company',data:{...},fields?:[],key:'insb'}
 * {cmd:'update',table:'company',data:{...},filter?:{...},fields?:[],key:'up'}
 * {cmd:'updateBatch',table:'company',data:[{updateObj}, ...],filterKey:'id',fields?:[],key:'upb'}
 * {cmd:'delete',table:'company',filter:{...},fields?:[],key:'del'}
 * {cmd:'sql',sql:'....',args?:[],key:'sql'}
 * @param cb (null, key_executeResult_, key_queryObject_)
 */
exports.queryWithTransaction = function (queryObjectList, dbName) {
  return new Promise(function (resolve, reject) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.queryWithTransaction(dbName, queryObjectList, function (err, key_executeResult_, key_queryObject_) {
      err ? reject(err) : resolve(key_executeResult_, key_queryObject_);
    });
  });
}

/**
 * @description
 * @param {*} sql
 * @param {*} args
 * @param {Object} options
 * @param {Object} options.client
 * @param {Boolean} options.onlyRows default=true
 * @returns
 */
exports.query = function (sql, args, options) {
  return new Promise(function (resolve, reject) {
    var inputClient = options && options.client;
    core.query(DEFAULT_DB_NAME, sql, args, inputClient, extractRowsForPromise(resolve, reject, options));
  });
}

exports.acquireDbClient = function (dbName) {
  return new Promise(function (resolve, reject) {
    if (!dbName) dbName = DEFAULT_DB_NAME;
    core.acquireDbClient(dbName, function (err, client, done) {
      err ? reject(err) : resolve({ client, done });
    });
  });
}
