/**
 * Created by zhongzhengkai on 17/3/10.
 * 暴露thunk格式的接口
 */

var pgManager = require('./api');

exports.acquirePoolClient = pgManager.acquirePoolClient;
exports.jsonbSet = pgManager.jsonbSet;
exports.initPool = pgManager.initPool;

/**
 * @param sql {String} - 欲执行的sql语句
 * @param args {Array} - sql语句里占位符实际要替换的字符串参数列表
 */
exports.query = function (sql, args) {
  return function (cb) {
    pgManager.query(sql, args, cb);
  }
};

/**
 * @description 指定一个临时的配置去做查询,通常用于脚本测试
 * @deprecated 服务器端的调用用query,而非queryOnce,query自带了连接池机制
 * @param cfg {Object} 指定连接配置
 * @param sql {String}
 * @param args {Array}
 */
exports.queryOnce = function(cfg, sql, args){
  return function (cb) {
    pgManager.queryOnce(cfg, sql, args, cb);
  }
};

/**
 * @description 带事务的一组sql命令操作
 * @param operations {Array} -命令数组,里面包含要按顺序执行的操作对象
 * 操作对象形如以下示例,tag用于记录返回的结果,:
 * {'$insert':{tableName:'company',toInsert:{...},tag:'insertCompany'}}
 * {'$insertBatch':{tableName:'company',toInserts:{...},tag:'insertCompany'}}
 * {'$update':{tableName:'company',filter:{...},toUpdate:{...},tag:'updateCompany'}}
 * {'$select':{tableName:'company',filter:{...},fields:[],tag:'selectCompany'}}
 * {'$delete':{tableName:'company',filter:{...},tag:'deleteCompany'}}
 * {'$rawSql':{sql:'select salary,id from company',args:[],tag:'getMySalary'}}
 *
 * perHandler(selfOp, results, opMap)
 */
exports.queryWithTransaction = function(operations){
  return function (cb) {
    pgManager.queryWithTransaction(operations, cb);
  }
};

/**
 * @description 向一张表里插入一条数据
 * @param tableName {String} 表名
 * @param toInsert {Object} 普通的json对象
 * @param returnFields {Array} 更新后要返回的字段值,空数组表示什么都不返回
 */
exports.insert = function(tableName, toInsert, returnFields){
  return function (cb) {
    pgManager.insert(tableName, toInsert, returnFields ,cb);
  }
};

/**
 * @description 向一张表里插入多条数据
 * @param tableName {String} 表名
 * @param toInserts {Array} 一个json数组,里面包含了欲插入的多个json对象
 * @param returnFields {Array} 更新后要返回的字段值,空数组表示什么都不返回
 */
exports.insertBatch = function(tableName, toInserts, returnFields){
  return function (cb) {
    pgManager.insertBatch(tableName, toInserts, returnFields, cb);
  }
};

/**
 * @description 跟新一张表的数据
 * @param tableName {String}
 * @param filter {Object} - 过滤器,满足这些过滤器条件的行将会被更新
 *
 *  filter 设计参考了mongodb的filter设计,如下面的filter对应生成的sql:
 *  {name:'zzk',age:{'$gte':20}} --> where name = 'zzk' and age >= 20
 *  {age:{'$ne':20}} --> where age != 20
 *  {} -->  where age in(20,30,40)
 *  $操作符目前实现的有如下部分
 *  {'$gte': '>=', '$gt': '>', '$eq': '=', '$lte': '<=', '$lt': '<', '$ne': '!=', '$in':'in'}
 *
 * @param returnFields {Array} 更新后要返回的字段值,空数组表示什么都不返回
 * @param toUpdate {Object}
 */
exports.update = function(tableName, toUpdate, filter, returnFields){
  return function (cb) {
    pgManager.update(tableName, toUpdate, filter, returnFields, cb);
  }
};

exports.updateBatch = function(tableName, toUpdates, filterKey, returnFields){
  return function (cb) {
    pgManager.updateBatch(tableName, toUpdates, filterKey, returnFields, cb);
  }
};

/**
 * @description 查询数据
 * @param tableName {String}
 * @param filter {Object} - 参见update函数的filter说明
 * @param fields {Array|Function} - 类型为Array时:默认会空的话,表示选出改数据的所有字段,
 * 类型Function时:为该字段设定为回调函数,也表示返回改数据的所有字段,此时第四个参数cb可以不用传递
 */
exports.select = function(tableName, filter, fields){
  return function (cb) {
    pgManager.select(tableName, filter, fields, cb);
  }
};

exports.remove = function (tableName, filter) {
  return function (cb) {
    pgManager.remove(tableName, filter, cb);
  }
};







