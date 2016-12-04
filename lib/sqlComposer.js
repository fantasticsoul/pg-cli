/**
 * Created by zzk on 16-08-19.
 * 因为postgres的字符串必须用单引号,所以本文件里的所有字符串申明用双引号
 */

'use strict';

var validOperator = {'$gte': '>=', '$gt': '>', '$eq': '=', '$lte': '<=', '$lt': '<', '$ne': '!=', '$in': 'in', '$like': 'like'};

/**
 * 构建where 子句
 * @param filter
 * @param args
 * @returns {*}
 */
function _filterToWhereClause(filter, args) {
  var clausePartial = "";
  var keyCount = Object.keys(filter).length;
  var keyIndex = 1;
  for (var fieldName in filter) {
    var andStr = " and ";
    if (keyIndex == keyCount)andStr = "";
    var fieldDesc = filter[fieldName];  //一个字段的查询描述对象 or 值
    var descType = typeof fieldDesc;
    if (descType == "string") {
      if (args) {
        clausePartial += '"' + fieldName + '"=$' + (args.length + 1) + andStr;
        args.push(fieldDesc);
      } else {
        clausePartial += '"' + fieldName + "\"='" + fieldDesc + "'" + andStr;
      }
    } else if (descType == "number" || descType == "boolean") {
      clausePartial += '"' + fieldName + '"=' + fieldDesc + andStr;
    } else if (descType == "object") { //fieldDesc形如:{"$gte":5}
      var operatorCode = Object.keys(fieldDesc)[0];
      var operator = validOperator[operatorCode];//>= , =, <......
      if (!operator) {
        throw new Error("_filterToWhereClause:invalid operator code " + operatorCode);
      }
      var operand = fieldDesc[operatorCode];//具体的操作数
      var operandType = typeof operand;
      if (args) {
        if (operatorCode == "$in") {
          if(!Array.isArray(operand))throw new Error('_filterToWhereClause:invalid operand(not an array) for operatorCode:$in in filter:', filter);
          if(operand.length >0){
            var operandItemType = typeof operand[0];
            if(operandItemType == 'number' || operandItemType == "boolean"){
              clausePartial += '"' + fieldName + '" ' + operator + '(' + operand.join(',') + ')' + andStr;
            }else if(operandItemType == 'string'){//string型,在in子句里要加上单引号
              clausePartial += '"' + fieldName + '" ' + operator + '(';
              var lastOperandIdx = operand.length - 1;
              operand.forEach(function(v,idx){
                clausePartial += "'"+v+"'";
                if(idx!=lastOperandIdx)clausePartial+=',';
              });
              clausePartial += ')' + andStr;
            }else{
              throw new Error('_filterToWhereClause:invalid operandItemType:'+operandItemType+' for operatorCode:$in in filter:', filter);
            }
          }else clausePartial += '1=1';
        } else {
          if (operandType == "string") {
            clausePartial += '"' + fieldName + '" ' + operator + " $" + (args.length + 1) + andStr;
            args.push(operand);
          } else if (operandType == "number" || operandType == "boolean") {
            clausePartial += '"' + fieldName + '" ' + operator + operand + andStr;
          } else {
            throw new Error("_filterToWhereClause:invalid operand type " + operandType + " in filter:", filter);
          }
        }
      } else {
        if (operatorCode == '$in') {
          if(!Array.isArray(operand))throw new Error('_filterToWhereClause:invalid operand(not an array) for operatorCode:$in in filter:', filter);
          if(operand.length>0){
            var operandItemType = typeof operand[0];
            if(operandItemType == 'number' || operandType == "boolean"){
              clausePartial += '"' + fieldName + '" ' + operator + '(' + operand.join(',') + ')' + andStr;
            }else if(operandItemType == 'string'){//string型,在in子句里要加上单引号
              clausePartial += '"' + fieldName + '" ' + operator + '(';
              var lastOperandIdx = operand.length - 1;
              operand.forEach(function(v,idx){
                clausePartial += "'"+v+"'";
                if(idx!=lastOperandIdx)clausePartial+=',';
              });
              clausePartial += ')' + andStr;
            }else{
              throw new Error('_filterToWhereClause:invalid operandItemType:'+operandItemType+' for operatorCode:$in in filter:', filter);
            }
          }else clausePartial += '1=1';
        } else {
          if (operandType == 'string') {
            clausePartial += '"' + fieldName + '" ' + operator + '"' + operand + '"' + andStr;
          } else if (operandType == 'number' || operandType == "boolean") {
            clausePartial += '"' + fieldName + '" ' + operator + operand + andStr;
          } else {
            throw new Error('_filterToWhereClause:invalid operand type ' + operandType + ' in filter:', filter);
          }
        }
      }
    } else {
      console.log('filter:'+JSON.stringify(filter));
      throw new Error('_filterToWhereClause:invalid field descriptor type, must be one of them:string,number,object,fieldName:'+fieldName+',descType:'+descType);
    }
    keyIndex++;
  }

  var whereClause = "";
  if (clausePartial)whereClause = " where " + clausePartial;
  return whereClause;
}

/**
 *
 * @param fields 指定查询的返回结果对象中,必须包含的字段,空的话表示返回所有字段
 * @param filter 查询的过滤条件,映射到where子句中
 * @param tableName
 * @param needArgs
 * @returns {*}
 */
function prepareSelectSql(tableName, filter, fields, needArgs) {
  var sql = 'select ';
  var args = null;
  if (needArgs) args = [];
  if (fields.length == 0) {//select出所有字段
    sql += '* ';
  } else {
    fields.forEach(function (f) {
      sql += ( '"' + f + '",');
    });
  }
  sql = sql.substring(0, sql.length - 1);
  sql += ' from "' + tableName + '"' + _filterToWhereClause(filter, args);
  //console.log('sql:', sql, args);
  return {sql: sql, args: needArgs ? args : []};
}

function prepareUpdateSql(tableName, filter, toUpdate, needArgs) {
  var sql = 'update "' + tableName + '" set ';
  var args = null;
  if (needArgs) args = [];
  var keyIndex = 1;
  for (var fieldName in toUpdate) {
    var startSymbol = ',';
    var val = toUpdate[fieldName];
    if (val != null && val != undefined) {
      if (keyIndex == 1)startSymbol = '';
      var valType = typeof val;
      if (valType == 'string' || valType == 'object' ) {//string类型的数据用占位符拼
        if(valType=='object') val = JSON.stringify(val);
        if (args) {
          sql += (startSymbol + '"' + fieldName + '"=$' + (args.length + 1) );
          args.push(val)
        } else {
          sql += (startSymbol + '"' + fieldName + '"=' + val );
        }
      } else if (valType == 'number' || valType == 'boolean') {
        sql += (startSymbol + '"' + fieldName + '"=' + val );
      } else {
        console.log(toUpdate);
        throw new Error('prepareUpdateSql:invalid field value type, must be one of them:string,number, filed:'+fieldName + ',value:'+val +',toUpdate:'+JSON.stringify(toUpdate));
      }
    }
    keyIndex++;
  }
  sql = sql + _filterToWhereClause(filter, args);
  //console.log('sql:', sql, args);
  return {sql: sql, args: needArgs ? args : needArgs ? args : []};
}

function prepareInsertSql(tableName, toInsert, needArgs) {
  var sql = 'insert into "' + tableName + '"(';
  var fieldClause = '';
  var valueClause = ' values(';
  var args = null;
  if (needArgs) args = [];
  var keyCount = Object.keys(toInsert).length;
  var keyIndex = 1;
  for (var filedName in toInsert) {
    var endSymbol = ',';
    if (keyIndex == keyCount)endSymbol = ')';
    //这里字段名必须加上双引号,要不然 isOld 这种驼峰命名会被当成 isold来识别,从而导致数据库找不到该列
    fieldClause += '"' + filedName + '"' + endSymbol;
    var val = toInsert[filedName];
    if (val === null || val === undefined) {
      valueClause += 'null' + endSymbol;
    }else{
      var valType = typeof val;
      if (valType == 'string' || valType == 'object') {
        if(valType == 'object') val = JSON.stringify(val);
        if (args) {
          valueClause += '$' + (args.length + 1) + endSymbol;
          args.push(val);
        } else {
          valueClause += "'" + val + "'" + endSymbol;
        }
      } else if (valType == 'number' || valType == 'boolean') {
        valueClause += val + endSymbol;
      } else {
        console.log('filedName:'+filedName,' val:',val);
        throw new Error('prepareInsertSql:invalid field value type, must be one of them:string,number,object valType:' + valType);
      }
    }
    keyIndex++;
  }
  if (keyCount == 0) { //!!! 否则会出现 insert into project( values( returning id 这样的语句
    fieldClause += ')';
    valueClause += ')';
  }
  valueClause += ' returning id';
  sql = sql + fieldClause + valueClause;
  //console.log('sql:', sql, args);
  return {sql: sql, args: needArgs ? args : []};
}

/**
 * 准备批量更新语句,必须保证每一个元素的key数量都和第一个元素一样
 * @param toInserts
 * @param tableName
 * @param needArgs
 * @returns {*}
 */
function prepareBatchInsertSql(tableName, toInserts, needArgs) {
  try{
    var insertsCount = toInserts.length;
    var oneElem = toInserts[0];
    var sql = 'insert into "' + tableName + '"(';
    var fieldClause = '';
    var valueClause = ' values';
    var args = null;
    if (needArgs) args = [];
    var fieldNameCount = Object.keys(oneElem).length;
    var elemKeyIndex = 1;
    for (var filedName in oneElem) {
      var endSymbol = ',';
      if (fieldNameCount == elemKeyIndex)endSymbol = ')';
      fieldClause += '"' + filedName + '"' + endSymbol;
      elemKeyIndex++;
    }

    for (var i = 0; i < insertsCount; i++) {
      var toInsert = toInserts[i];
      var keyCount = Object.keys(toInsert).length;
      if (keyCount != fieldNameCount)throw new Error('prepareBatchInsertSql:one element\'s key count not equal first element');
      var keyIndex = 1;
      for (var filedName in toInsert) {
        var endSymbol2 = ',';
        if (keyIndex == 1)valueClause += '(';
        if (keyIndex == keyCount)endSymbol2 = ')';
        var val = toInsert[filedName];
        var valType = typeof val;
        if (valType == 'string' || valType == 'object') {
          if(valType == 'object') val = JSON.stringify(val);
          valueClause += '$' + (args.length + 1) + endSymbol2;
          args.push(val);
        } else if (valType == 'number' || valType == 'boolean') {
          valueClause += val + endSymbol2;
        } else {
          throw new Error('prepareBatchInsertSql:filed:'+filedName+',invalid value type, must be one of them:string,number');
        }
        keyIndex++;
      }
      if (i < (insertsCount - 1)) {
        valueClause += ',';
      }
    }
    valueClause += ' returning id';
    sql = sql + fieldClause + valueClause;
    //console.log('sql:', sql, args);
    return {sql: sql, args: needArgs ? args : needArgs ? args : []};
  }catch(ex){
    throw ex;
  }

}

function prepareDeleteSql(tableName, filter, needArgs) {
  var sql = 'delete from "' + tableName + '"';
  var args = null;
  if (needArgs) args = [];
  sql = sql + _filterToWhereClause(filter, args);
  //console.log('sql:', sql, args);
  return {sql: sql, args: needArgs ? args : []};
}

module.exports = {
  prepareSelectSql: prepareSelectSql,
  prepareUpdateSql: prepareUpdateSql,
  prepareInsertSql: prepareInsertSql,
  prepareBatchInsertSql: prepareBatchInsertSql,
  prepareDeleteSql: prepareDeleteSql
};