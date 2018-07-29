/**
 * Created by zhongzhengkai on 16/8/19.
 */

//后面采用require('pg').native来加速查询速度
var pg = require('pg');
//@see https://github.com/tgriesser/knex/issues/387,
//让 bigint numeric 都不以string返回,而是转为正确的格式
pg.types.setTypeParser(20, 'text', parseInt);
pg.types.setTypeParser(1700, 'text', parseFloat);//让numeric也从string,变成float
var async = require('async');
var sqlComposer = require('./sqlComposer');
var util = require('./util');
var co = require('co');
var DEFAULT_DB_NAME = util.DEFAULT_DB_NAME;

//this initializes a connection pool
//it will keep idle connections open for a 30 seconds
//and set a limit of maximum 10 idle clients
var dbName_pool_ = {};//支持管理多个数据库的db连接池
var dbName_config_ = {};//缓存起来传进来的配置对象
var dbNameList = [];//连接上的多个数据库名称

function extractOptionClient(options) {
  var client = null;
  if (options) client = options.client;
  return client;
}

/**
 * 初始化连接池对象,默认会使用config的database作为key映射pool，
 * 如果传入了dbName且dbName和database不相等，也会使用dbName作为key映射pool，
 * 此时dbName与database指向的是同一个pool
 * @param {Object} otherConfig
 * @param {Function} otherConfig.sqlWatcher
 */
function initPool(dbConfig, alias, customizeConfig) {
  if (!alias) alias = DEFAULT_DB_NAME;
  if (!customizeConfig) customizeConfig = {};

  var initialedPool = dbName_pool_[alias];
  if (!initialedPool) {
    var pool = new pg.Pool(dbConfig);
    var dbName = dbConfig.database;
    dbNameList.push(dbName);
    pool.__db__ = dbName;
    dbName_pool_[alias] = pool;
    dbName_pool_[dbName] = pool;

    var startupConfig = { dbConfig, alias, customizeConfig };
    dbName_config_[alias] = startupConfig;
    dbName_config_[dbName] = startupConfig;
  } else {
    if (initialedPool.__db__ != dbConfig.database) {//不允许用一个别名初始化多个不同的数据库
      throw new Error(`alias [${alias}] has already been initialized to db ${initialedPool.__db__}`);
    } else {
      // do nothing, 保证只初始化一次
    }
  }
}

/**
 * @description 获取所有映射好的数据库名的列表
 * @author zzk
 * @returns
 */
function getDbNameList() {
  return dbNameList;
}

function getConfig(dbName) {
  return dbName_config_[dbName];
}

function getSqlWatcher(dbName) {
  const config = getConfig(dbName);
  return config.customizeConfig.sqlWatcher;
}

function getDbConfig(dbName) {
  const config = getConfig(dbName);
  return config.dbConfig;
}

function getCustomizeConfig(dbName) {
  const config = getConfig(dbName);
  return config.customizeConfig;
}

function getPool(dbName = DEFAULT_DB_NAME) {
  var pool = dbName_pool_[dbName];
  if (!pool) throw new Error('pool not found for db:' + dbName + ', you must call method [initPool] before you use this lib');
  return pool;
}

/**
 * 从连接池里获得一个连接句柄
 * @param cb //err, client, done
 */
function acquireDbClient(dbName, cb) {
  getPool(dbName).connect(cb);
}


/**
 * @description 获取多个数据库的连接句柄
 * @author zzk
 * @param {*} dbNames
 * @param {*} cb (err, { ${dbName} : {client, done}} )
 */
function acquireMultiDbClient(dbNames, cb) {
  var poolItems = dbNames.map(function (dbName) {
    return { dbName: dbName, pool: getPool(dbName) };
  });
  var dbName_clientItem_ = {};
  async.each(poolItems, function (item, callback) {
    item.pool.connect(function (err, client, done) {
      if (err) {
        callback(err)
      } else {
        dbName_clientItem_[item.dbName] = { client, done };
        callback();
      }
    });
  }, function (err) {
    cb(err, dbName_clientItem_);
  });
}

/**
 * @param sql {String} - 欲执行的sql语句
 * @param args {Array} - sql语句里占位符实际要替换的字符串参数列表
 * use case : query('select * from company where age > $1 and address = $2',[190,'BeiJing'], function(err, result){})
 * @param cb (err, result)=>{}
 */
function query(dbName, sql, args, client, cb) {
  var sqlWatcher = getSqlWatcher(dbName);
  sqlWatcher && sqlWatcher(getDbConfig(dbName).database, sql, args);

  if (client) {//由startTransaction函数传入的client, 或者自己调用acquireDbClient拿到的client
    client.query(sql, args, cb);
  } else {
    acquireDbClient(dbName, function (err, client, done) {
      if (err) {
        done();
        cb(err, null);
      } else {
        client.query(sql, args, function (err, result) {
          done();
          cb(err, result);
        });
      }
    });
  }
}

//queryObject may like: 
// {cmd:'update', key:'updateCompany', table:'company', data:{name:'zzk',age:2}, filter:{id:1}, fields:[] }
// {cmd:'select', key:'selectCompany', table:'company', filter:{name:'zzk',age:2}, fields:[] }
// {cmd:'insert', key:'insertCompany', table:'company', data:{name:'zzk',age:2}, fields:[] }
// {cmd:'delete', key:'deleteCompany', table:'company', filter:{name:'zzk',age:2}, fields:[] }
// {cmd:'sql', key:'rawsql', table:'company', sql:'select * from company', args:[] }
function wrapQueryObject(queryObject) {
  var fields = queryObject.fields || [];
  var table = queryObject.table;
  var cmd = queryObject.cmd;
  var ret = null;// sqlComposer's result
  switch (cmd) {
    case 'insert':
      ret = sqlComposer.prepareInsertSql(table, queryObject.data, queryObject.options, true);
      break;
    case 'insertBatch':
      var data = paload.data;
      if (!Array.isArray(data)) throw new Error('key ' + queryObject.key + ', [insertBatch] queryObject\'s prop data is not an array');
      if (data.length != 0) {
        ret = sqlComposer.prepareBatchInsertSql(table, data, queryObject.options, true);
      }
      break;
    case 'update':
      ret = sqlComposer.prepareUpdateSql(table, queryObject.data, queryObject.options, true);
      break;
    case 'updateBatch':
      var data = paload.data;
      if (!Array.isArray(data)) throw new Error('key ' + queryObject.key + ', [updateBatch] queryObject\'s prop data is not an array');
      if (data.length != 0) {
        ret = sqlComposer.prepareBatchUpdateSql(table, queryObject.data, queryObject.options, fields);
      }
      break;
    case 'select':
      ret = sqlComposer.prepareSelectSql(table, queryObject.options, true);
      break;
    case 'delete':
      ret = sqlComposer.prepareDeleteSql(table, queryObject.options, true);
      break;
    case 'sql':
      ret = { sql: queryObject.sql, args: queryObject.args || [] };
      break;
    default:
      throw new Error('queryWithTransaction: unsupported cmd:' + cmd);
  }
  if (ret) {
    return { sql: ret.sql, args: ret.args, queryObject: queryObject };
  }
}


/**
 * 执行事务性的一组操作
 * @param operations {Array}
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
function queryWithTransaction(dbName, queryObjectList, cb) {
  if (typeof dbName != 'string') {
    return cb(new Error(`first argument of core.queryWithTransaction must be dbName!`));
  }

  acquireDbClient(dbName, function (err, client, done) {
    if (err) {
      cb(err);
    } else {
      var key_executeResult_ = {};
      var keyRecorder = {};
      var wrappedQueryObjectList = [];
      var key_queryObject_ = {};
      try {
        queryObjectList.forEach(function (queryObject) {
          var key = queryObject.key;
          if (keyRecorder[key] != null) throw new Error('queryWithTransaction: key duplicated:' + key);
          keyRecorder[key] = key;

          var wrappedQueryObject = wrapQueryObject(queryObject);
          if (wrappedQueryObject) { //有可能不生成wrappedQueryObject对象
            wrappedQueryObjectList.push(wrappedQueryObject);
            key_queryObject_[key] = queryObject;
          }
        });
      } catch (ex) {
        return cb(ex);
      }

      client.query('begin');//开始事务
      async.mapSeries(wrappedQueryObjectList, function (wrappedQueryObject, callback) {
        var queryObject = wrappedQueryObject.queryObject;
        if (queryObject.preHandler) {
          try {
            queryObject.preHandler(queryObject, key_executeResult_, key_queryObject_);
          } catch (ex) {
            return callback(ex);
          }
        }
        client.query(wrappedQueryObject.sql, wrappedQueryObject.args, function (err, result) {
          if (err) {
            callback(err);
          } else {
            key_executeResult_[wrappedQueryObject.queryObject.key] = result.rows;
            callback(null);
          }
        });
      }, function (err) {
        done();//归还连接对象给连接池
        if (err) {
          client.query('rollback', function () {
            cb(err);
          });//回滚事务
        } else {
          client.query('commit', function () {
            cb(null, key_executeResult_, key_queryObject_);
          });//提交事务
        }
      });
    }
  });
}

function startTransaction(dbName, fn, cb) {
  if (typeof dbName != 'string') {
    return cb(new Error(`first argument of core.startTransaction must be dbName!`));
  }

  var isGeneratorFunction = util.isGeneratorFunction(fn);
  var isAsyncFunction = util.isAsyncFunction(fn);
  if (isGeneratorFunction || isAsyncFunction) {
    acquireDbClient(dbName, function (err, client, done) {
      if (err) return cb(err);
      client.query('begin');

      var runningFn;
      if (isGeneratorFunction) runningFn = co(fn(client));
      else runningFn = fn(client);
      runningFn.then(function (result) {
        client.query('commit', function () {
          done();
          cb(null, result);
        });
      }).catch(function (err) {
        client.query('rollback', function () {
          done();
          cb(err);
        });
      });
    });
  } else {
    var err = new Error('[startTransaction]: fn is not a generatorFunction or asyncFunction');
    cb(err);
  }
}

function _eachQuery(command, dbNames, clientItemMap, resultOrErr, cb) {
  async.each(dbNames, function (dbName, callback) {
    var item = clientItemMap[dbName];
    item.client.query(command, function () {
      var customizeConfig = getCustomizeConfig(dbName);
      if (customizeConfig.printTransactionProcess) {
        console.log(`  >>>>>> ${dbName} ${command}`);
      }
      item.done();
      callback();
    });
  }, function () {
    command == 'commit' ? cb(null, resultOrErr) : cb(resultOrErr);
  });
}

function startMultiDbTransaction(dbNames, fn, cb) {
  if (!Array.isArray(dbNames)) {
    return cb(new Error(`first argument of core.startMultiDbTransaction must be dbNames!`));
  }

  var isGeneratorFunction = util.isGeneratorFunction(fn);
  var isAsyncFunction = util.isAsyncFunction(fn);
  if (isGeneratorFunction || isAsyncFunction) {
    acquireMultiDbClient(dbNames, function (err, clientItemMap) {
      if (err) return cb(err);
      var clientMap = {};
      dbNames.forEach(name => {
        var tmpClient = clientItemMap[name].client;
        clientMap[name] = tmpClient;
        tmpClient.query('begin');
      });

      var runningFn;
      if (isGeneratorFunction) runningFn = co(fn(clientMap));
      else runningFn = fn(clientMap);
      runningFn.then(function (result) {
        _eachQuery('commit', dbNames, clientItemMap, result, cb);
      }).catch(function (err) {
        _eachQuery('rollback', dbNames, clientItemMap, err, cb)
      });
    });
  } else {
    var err = new Error('[startMultiDbTransaction]: fn is not a generatorFunction or asyncFunction');
    cb(err);
  }
}

/**
 * 使用指定的配置,做一次临时的查询操作
 * 适合执行完即结束的脚本操作
 * @param cfg
 * @param sql
 * @param args
 * @param cb
 */
function queryOnce(cfg, sql, args, cb) {
  var client = new pg.Client(cfg);
  client.connect(function (err) {
    if (err) {
      return cb(err, null);
    }
    client.query(sql, args, function (err, result) {
      if (err) {
        cb(err, null);
      } else {
        client.end(function (err) {
          if (err) console.error('error disconnect the client', err);
        });
        cb(null, result);//result.rows 是需要的数据
      }
    });
  });
}

function select(dbName, tableName, options, cb) {
  var sc = sqlComposer.prepareSelectSql(tableName, options, true);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

function insert(dbName, tableName, toInsert, options, cb) {
  var sc = sqlComposer.prepareInsertSql(tableName, toInsert, options, true);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

function insertBatch(dbName, tableName, toInserts, options, cb) {
  var sc = sqlComposer.prepareBatchInsertSql(tableName, toInserts, options, true);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

function update(dbName, tableName, toUpdate, options, cb) {
  var sc = sqlComposer.prepareUpdateSql(tableName, toUpdate, options, true);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

function updateBatch(dbName, tableName, toUpdates, options, cb) {
  var sc = sqlComposer.prepareBatchUpdateSql(tableName, toUpdates, options);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

function del(dbName, tableName, options, cb) {
  var sc = sqlComposer.prepareDeleteSql(tableName, options, true);
  query(dbName, sc.sql, sc.args, extractOptionClient(options), cb);
}

module.exports = {
  getSqlWatcher: getSqlWatcher,
  getConfig: getConfig,
  getDbConfig: getDbConfig,
  getDbNameList: getDbNameList,
  acquireDbClient: acquireDbClient,
  initPool: initPool,
  query: query,
  queryOnce: queryOnce,
  queryWithTransaction: queryWithTransaction,
  startTransaction: startTransaction,
  startMultiDbTransaction: startMultiDbTransaction,
  select: select,
  insert: insert,
  insertBatch: insertBatch,
  update: update,
  updateBatch: updateBatch,
  delete: del,
};
