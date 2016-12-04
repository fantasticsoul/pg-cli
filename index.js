/**
 * Created by zhongzhengkai on 2016/12/5.
 */

var sqlComposer = require('./lib/sqlComposer');
var helper = require('./lib/manager');

helper.sqlComposer = sqlComposer;

module.exports = helper;