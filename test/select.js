
//writing 1:
//require('./initialized-pg-helper');
//var pgHelper = require('../../pg-cli');

//writing 2:
var pgHelper = require('./initialized-pg-helper');

pgHelper.query('select * from "YearBudget"', [], function(err, reply){
  console.log(err, reply);
});