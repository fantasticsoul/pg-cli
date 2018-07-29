'use strict';
var validOperator = { '$gte': '>=', '$gt': '>', '$eq': '=', '$lte': '<=', '$lt': '<', '$ne': '!=', '$in': 'in', '$like': 'like' };

function fieldsToReturningClause(fields) {
  var returnClause = '';
  if (fields.length > 0) {
    if (fields[0] == '*') returnClause += ' returning *';
    else {
      fields.forEach((f, idx) => {
        if (idx == 0) returnClause += '"' + f + '"';
        else returnClause += ',"' + f + '"'
      });
      returnClause = ' returning ' + returnClause;
    }
  }
  return returnClause;
}

/**
 * 构建where 子句
 * @param filter
 * @param args
 * @returns {*}
 */
function _filterToWhereClause(filter, args) {
  var clausePartial = "";
  var keyIndex = 1;
  for (var fieldName in filter) {
    var andStr = "";
    if (keyIndex != 1) andStr = " and ";
    var fieldDesc = filter[fieldName];  //一个字段的查询描述对象 or 值
    var descType = typeof fieldDesc;
    if (descType == "string") {
      if (args) {
        clausePartial += andStr + '"' + fieldName + '"=$' + (args.length + 1);
        args.push(fieldDesc);
      } else {
        clausePartial += andStr + '"' + fieldName + "\"='" + fieldDesc + "'";
      }
    } else if (descType == "number" || descType == "boolean") {
      clausePartial += andStr + '"' + fieldName + '"=' + fieldDesc;
    } else if (descType == "object") { //fieldDesc形如:{"$gte":5}
      var operatorCodeArr = Object.keys(fieldDesc);

      var andStrForOPCode = "";
      var keyIndexForOPCode = 1;
      operatorCodeArr.forEach(operatorCode => {
        if (keyIndexForOPCode != 1 || keyIndex != 1) andStrForOPCode = " and ";//这里不能漏判断keyIndex
        var operator = validOperator[operatorCode];//>= , =, <......
        if (!operator) {
          throw new Error("_filterToWhereClause:invalid operator code " + operatorCode);
        }
        var operand = fieldDesc[operatorCode];//具体的操作数
        var operandType = typeof operand;
        if (args) {
          if (operatorCode == "$in") {
            if (!Array.isArray(operand)) throw new Error('_filterToWhereClause:invalid operand(not an array) for operatorCode:$in in filter:', filter);
            if (operand.length > 0) {
              var operandItemType = typeof operand[0];
              if (operandItemType == 'number' || operandItemType == "boolean") {
                clausePartial += andStrForOPCode + '"' + fieldName + '" ' + operator + '(' + operand.join(',') + ')';
              } else if (operandItemType == 'string') {//string型,在in子句里要加上单引号
                clausePartial += '"' + fieldName + '" ' + operator + '(';
                var lastOperandIdx = operand.length - 1;
                operand.forEach(function (v, idx) {
                  clausePartial += "'" + v + "'";
                  if (idx != lastOperandIdx) clausePartial += ',';
                });
                clausePartial += andStrForOPCode + ')';
              } else {
                throw new Error('_filterToWhereClause:invalid operandItemType:' + operandItemType + ' for operatorCode:$in in filter:', filter);
              }
            } else clausePartial += '1=1';
          } else {
            if (operandType == "string") {
              clausePartial += andStrForOPCode + '"' + fieldName + '"' + operator + " $" + (args.length + 1);
              args.push(operand);
            } else if (operandType == "number" || operandType == "boolean") {
              clausePartial += andStrForOPCode + '"' + fieldName + '"' + operator + operand;
            } else {
              throw new Error("_filterToWhereClause:invalid operand type " + operandType + " in filter:", filter);
            }
          }
        } else {
          if (operatorCode == '$in') {
            if (!Array.isArray(operand)) throw new Error('_filterToWhereClause:invalid operand(not an array) for operatorCode:$in in filter:', filter);
            if (operand.length > 0) {
              var operandItemType = typeof operand[0];
              if (operandItemType == 'number' || operandType == "boolean") {
                clausePartial += andStrForOPCode + '"' + fieldName + '" ' + operator + '(' + operand.join(',') + ')';
              } else if (operandItemType == 'string') {//string型,在in子句里要加上单引号
                clausePartial += '"' + fieldName + '" ' + operator + '(';
                var lastOperandIdx = operand.length - 1;
                operand.forEach(function (v, idx) {
                  clausePartial += "'" + v + "'";
                  if (idx != lastOperandIdx) clausePartial += ',';
                });
                clausePartial += andStrForOPCode + ')';
              } else {
                throw new Error('_filterToWhereClause:invalid operandItemType:' + operandItemType + ' for operatorCode:$in in filter:', filter);
              }
            } else clausePartial += '1=1';
          } else {
            if (operandType == 'string') {
              clausePartial += andStrForOPCode + '"' + fieldName + '"' + operator + '"' + operand + '"';
            } else if (operandType == 'number' || operandType == "boolean") {
              clausePartial += andStrForOPCode + '"' + fieldName + '"' + operator + operand;
            } else {
              throw new Error('_filterToWhereClause:invalid operand type ' + operandType + ' in filter:', filter);
            }
          }
        }
        keyIndexForOPCode++;
      });

    } else {
      console.log('filter:' + JSON.stringify(filter));
      throw new Error('_filterToWhereClause:invalid field descriptor type, must be one of them:string,number,object,fieldName:' + fieldName + ',descType:' + descType);
    }
    keyIndex++;
  }

  var whereClause = "";
  if (clausePartial) whereClause = " where " + clausePartial;
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
function prepareSelectSql(tableName, options, needArgs) {
  options = options || {};
  var fields = options.fields || [];
  var filter = options.filter || {};
  var sql = 'select ';
  var args = null;
  if (needArgs) args = [];
  var len = fields.length;
  if (len == 0) {//select出所有字段
    sql += '* ';
  } else {
    var lastIdx = len - 1;
    fields.forEach(function (f, idx) {
      sql += ('"' + f + '"');
      if (idx != lastIdx) sql += ',';
    });
  }
  sql += ' from "' + tableName + '"' + _filterToWhereClause(filter, args);
  return { sql: sql, args: args || [] };
}

function JSONBSetClazz(items) {
  this.items = items;
}

/**
 * @see https://www.postgresql.org/docs/9.6/static/functions-json.html
 * items like: [ { path:[<string>,<number>,...], newValue:<string>|<object>, createMissing:<boolean> } ]
 * 对于postgres来说,createMissing默认是true
 * @param items
 * @constructor
 */
function jsonbSet(items) {
  return new JSONBSetClazz(items);
}

/**
 * input:
 *  'PRCampaign',
 * [
 *    {path:['a','b',1],value:{s:1,e:1}},
 *    {path:'{"a","c"}',value:'{"s":1,"e":1}'}
 * ]
 * output:
 * jsonb_set(jsonb_set("PRCampaign",'{"a","b",1}','{"s":1,"e":1}'),'{"a","c"}','{"s":1,"e":1}')
 *
 * @param updateColumn
 * @param jsonbSet
 * @returns {string}
 */
function jsonbSetToSql(updateColumn, jsonbSet) {
  var items = jsonbSet.items;
  var sql = '';
  var curTarget = '';
  items.forEach((val, idx) => {
    var target = '"' + updateColumn + '"';
    if (idx > 0) target = curTarget;

    var path = val.path;
    var keyPath = '';
    if (Array.isArray(path)) {
      path.forEach((p, idx) => {
        if (typeof p == 'string') path[idx] = '"' + p + '"'
      });
      keyPath += '{' + path.join(',') + '}';
    }
    else keyPath = path;

    var newValue = val.value;
    if (typeof newValue == 'object') newValue = JSON.stringify(newValue);

    var createMissing = '';
    if (val.createMissing == false) createMissing = ',false';

    sql = 'jsonb_set(' + target + ',\'' + keyPath + '\',\'' + newValue + '\'' + createMissing + ')';
    curTarget = sql;
  });
  return sql;
}

/**
 *
 * @param tableName
 * @param toUpdate
 * @param options
 * @param needArgs
 * @returns {{sql: string, args: Array}}
 */
function prepareUpdateSql(tableName, toUpdate, options, needArgs) {
  options = options || {};
  var filter;
  if (options.filter) {
    filter = options.filter;
  } else {
    if (toUpdate.id != null) filter = { id: toUpdate.id };
    else filter = {};
  }
  var returnFields = options.fields || [];

  var sql = 'update "' + tableName + '" set ';
  var args = null;
  if (needArgs) args = [];
  var keyIndex = 1;
  for (var fieldName in toUpdate) {
    //!!! if(fieldName=='id')continue;
    var startSymbol = ',';
    var val = toUpdate[fieldName];
    if (val != null && val != undefined) {
      if (keyIndex == 1) startSymbol = '';
      var valType = typeof val;
      if (valType == 'string' || valType == 'object') {//string类型的数据用占位符拼
        var jsonbFlag = '', noPush = false;
        if (valType == 'object') {
          if (val instanceof JSONBSetClazz) val = jsonbSetToSql(fieldName, val), noPush = true;
          else val = JSON.stringify(val), jsonbFlag = '::jsonb';
        }

        if (args) {
          if (noPush) {
            sql += (startSymbol + '"' + fieldName + '"=' + val + jsonbFlag);
          } else {
            sql += (startSymbol + '"' + fieldName + '"=$' + (args.length + 1) + jsonbFlag);
            args.push(val)
          }
        } else {
          sql += (startSymbol + '"' + fieldName + '"=' + val + jsonbFlag);
        }
      } else if (valType == 'number' || valType == 'boolean') {
        sql += (startSymbol + '"' + fieldName + '"=' + val);
      } else {
        console.error(toUpdate);
        throw new Error('prepareUpdateSql:invalid field value type, must be one of them:string,number, filed:' + fieldName + ',value:' + val + ',toUpdate:' + JSON.stringify(toUpdate));
      }
    }
    keyIndex++;
  }
  sql = sql + _filterToWhereClause(filter, args);
  if (returnFields) {
    sql += fieldsToReturningClause(returnFields);
  }
  return { sql: sql, args: args || [] };
}

/*
 update {table_name} set {field_name} = case id 
  when 1 then '1' 
  when 2 then '1' 
  end where id in(1, 2);
 !!!!!! 类似下面的语句，目前postgres不能更新，这是一个bug
 update "Quotation" set "executeTime"= case id when 343 then '{"endTime":1492358399000,"startTime":1491580800000}' end where "id"=343
 */
function prepareBatchUpdateSql(tableName, toUpdates, options) {
  options = options || {};
  var returnFields = options.fields | [];

  var filterKey;
  if (options.filterKey) {
    filterKey = options.filterKey;
  } else {
    var oneData = toUpdates[0];
    if (oneData.id != null) filterKey = 'id';
    else throw new Error('[prepareBatchUpdateSql] must specify filterKey in options, or toUpdates item must include property:id');
  }
  // if(Array.isArray(filterKey))filterKey = filterKey[0];//!!! 暂时兼容上层传错的问题
  if (!filterKey) filterKey = 'id';
  var sql = 'update "' + tableName + '" set';
  var args = [];
  var setClause = '';
  var setClauseMap = {};

  toUpdates.forEach(up => {
    var setKeys = Object.keys(up);
    var valOfFilterKey = up[filterKey];
    setKeys.forEach(key => {
      if (key != filterKey) {
        var subSetClause = setClauseMap[key];
        if (!subSetClause) subSetClause = ' "' + key + '" = case ' + filterKey;
        var val = up[key];
        var valType = typeof val;
        if (valType == 'string' || valType == 'object') {//string类型的数据用占位符拼
          var jsonbFlag = '', noPush = false;
          if (valType == 'object') {
            if (val instanceof JSONBSetClazz) val = jsonbSetToSql(key, val), noPush = true;
            else val = JSON.stringify(val), jsonbFlag = '::jsonb';
          }

          if (noPush) {//对于jsonb_set函数的更新，不需要使用占位符，要不然会报错
            subSetClause += ' when ' + valOfFilterKey + ' then ' + val;
          } else {
            subSetClause += ' when ' + valOfFilterKey + ' then $' + (args.length + 1) + jsonbFlag;
            args.push(val)
          }
        } else if (valType == 'number' || valType == 'boolean') {
          subSetClause += ' when ' + valOfFilterKey + ' then ' + val;
        } else {
          throw new Error('prepareBatchUpdateSql:invalid field value type, must be one of them:string,number, filed:' + key + ',value:' + val);
        }
        setClauseMap[key] = subSetClause;
      }
    });
  });

  var keysOfSetClauseMap = Object.keys(setClauseMap);
  var lastKeyIdx = keysOfSetClauseMap.length - 1;
  keysOfSetClauseMap.forEach((key, idx) => {
    var endSymbol = lastKeyIdx == idx ? ' ' : ',';
    setClause += setClauseMap[key] + ' end' + endSymbol;
  });

  var valsOfInClause = toUpdates.map(v => {
    var val = v[filterKey];
    if (!val) throw new Error('prepareBatchUpdateSql:one element has no key:' + filterKey + ' as a filter in where clause,please check your update list!');
    var valType = typeof (val);
    if (valType == 'string') {
      args.push(val);
      return "$" + (args.length);
    } else {
      return val;
    }
  });

  setClause += 'where "' + filterKey + '" in(' + valsOfInClause.join(',') + ')';
  sql += setClause;
  if (returnFields && returnFields.length > 0) {
    sql += fieldsToReturningClause(returnFields);
  }
  return { sql: sql, args: args };
}

function prepareInsertSql(tableName, toInsert, options, needArgs) {
  options = options || {};
  var returnFields = options.fields || [];

  var sql = 'insert into "' + tableName + '"(';
  var fieldClause = '';
  var valueClause = ' values(';
  var args = null;
  if (needArgs) args = [];
  var keyCount = Object.keys(toInsert).length;
  var keyIndex = 1;
  for (var filedName in toInsert) {
    var endSymbol = ',';
    if (keyIndex == keyCount) endSymbol = ')';
    fieldClause += '"' + filedName + '"' + endSymbol;
    var val = toInsert[filedName];
    if (val === null || val === undefined) {
      valueClause += 'null' + endSymbol;
    } else {
      var valType = typeof val;
      if (valType == 'string' || valType == 'object') {
        if (valType == 'object') val = JSON.stringify(val);
        if (args) {
          valueClause += '$' + (args.length + 1) + endSymbol;
          args.push(val);
        } else {
          valueClause += "'" + val + "'" + endSymbol;
        }
      } else if (valType == 'number' || valType == 'boolean') {
        valueClause += val + endSymbol;
      } else {
        console.log('filedName:' + filedName, ' val:', val);
        throw new Error('prepareInsertSql:invalid field value type, must be one of them:string,number,object valType:' + valType);
      }
    }
    keyIndex++;
  }
  if (keyCount == 0) { //!!! 否则会出现 insert into project( values( returning id 这样的语句
    fieldClause += ')';
    valueClause += ')';
  }
  sql = sql + fieldClause + valueClause;
  if (returnFields) sql += fieldsToReturningClause(returnFields);
  return { sql: sql, args: args || [] };
}

/**
 * 准备批量插入语句,必须保证每一个元素的key数量都和第一个元素一样
 * @param tableName
 * @param toInserts
 * @param options
 * @param needArgs
 * @returns {*}
 */
function prepareBatchInsertSql(tableName, toInserts, options, needArgs) {
  options = options || {};
  var returnFields = options.fields || [];

  var insertsCount = toInserts.length;
  var oneElem = toInserts[0];
  var sql = 'insert into "' + tableName + '"(';
  var fieldClause = '';
  var valueClause = ' values';
  var args = null;
  if (needArgs) args = [];
  var fieldList = Object.keys(oneElem);
  var fieldNameCount = fieldList.length;
  var elemKeyIndex = 1;
  fieldList.forEach(function (f) {
    let endSymbol = ',';
    if (fieldNameCount == elemKeyIndex) endSymbol = ')';
    fieldClause += '"' + f + '"' + endSymbol;
    elemKeyIndex++;
  });

  for (var i = 0; i < insertsCount; i++) {
    var toInsert = toInserts[i];
    var keyCount = Object.keys(toInsert).length;
    if (keyCount != fieldNameCount) throw new Error('prepareBatchInsertSql:one element\'s key count:' + keyCount + ' not equal first element:' + fieldNameCount);
    var keyIndex = 1;
    fieldList.forEach(function (f) {
      let endSymbol = ',';
      if (keyIndex == 1) valueClause += '(';
      if (keyIndex == keyCount) endSymbol = ')';
      var val = toInsert[f];
      var valType = typeof val;
      if (valType == 'string' || valType == 'object') {
        if (valType == 'object') val = JSON.stringify(val);
        valueClause += '$' + (args.length + 1) + endSymbol;
        args.push(val);
      } else if (valType == 'number' || valType == 'boolean') {
        valueClause += val + endSymbol;
      } else {
        console.error('tableName:', tableName, " toInserts:", JSON.stringify(toInserts), " f:", f, " valType:", valType);
        throw new Error('prepareBatchInsertSql:filed:' + f + ',invalid value type, must be one of them:string,number');
      }
      keyIndex++;
    });

    if (i < (insertsCount - 1)) {
      valueClause += ',';
    }
  }
  sql = sql + fieldClause + valueClause;
  if (returnFields) sql += fieldsToReturningClause(returnFields);
  return { sql: sql, args: needArgs ? args : [] };
}

function prepareDeleteSql(tableName, options, needArgs) {
  options = options || {};
  var filter = options.filter || {};

  var sql = 'delete from "' + tableName + '"';
  var args = null;
  if (needArgs) args = [];
  sql = sql + _filterToWhereClause(filter, args);
  return { sql: sql, args: args || [] };
}

module.exports = {
  prepareSelectSql: prepareSelectSql,
  prepareInsertSql: prepareInsertSql,
  prepareBatchInsertSql: prepareBatchInsertSql,
  prepareUpdateSql: prepareUpdateSql,
  prepareBatchUpdateSql: prepareBatchUpdateSql,
  prepareDeleteSql: prepareDeleteSql,
  jsonbSet: jsonbSet
};

