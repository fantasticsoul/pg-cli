const fs = require('fs');
const helper = require('./initialized-pg-helper');
const api = helper.api;

fs.readFile(__dirname + '/db.sql', (err, content) => {
  if(err) return console.log(err);
  const createTableSql = content.toString();
  api.query(createTableSql, [], (err, result)=>{
    console.log(err);
    console.log(result);
  });
})
