/**
 * Created by zhongzhengkai on 2016/12/5.
 */

var sqlComposer = require('./lib/sqlComposer');
var helper = require('./lib/manager');
var thunk = require('./lib/thunk');

helper.sqlComposer = sqlComposer;
helper.thunk = thunk;

module.exports = helper;