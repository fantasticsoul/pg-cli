
//writing 1:
//require('./initialized-pg-helper');
//var pgHelper = require('../../pg-cli');

//writing 2:
var pgHelper = require('./initialized-pg-helper');

// pgHelper.query('select * from "client"', [], function(err, reply){
//   console.log(err, reply.rows);
// });

// pgHelper.select('client', null, function (err, reply) {
//   console.log(err, reply.rows);
// });

// pgHelper.select('client', null, (err, reply) => {
//   console.log(err, reply);
// });

function get(id, options) {
  return cb => pgHelper.select('client', { filter: { id }, ...options }, cb)
}

function update(department, options) {
  return cb => pgHelper.update('client', { id: 1, department }, options, cb);
}

function getUsersP(client) {
  return new Promise((resolve, reject) => {
    pgHelper.select('client', { client }, (err, rows) => {
      err ? reject(err) : resolve(rows);
    })
  })
}

pgHelper.startTransaction(function* (client) {
  const users = yield update('x6', { client });
  const users2 = yield get(1);
}, (err, result) => {
  console.log(err, result);
})

// pgHelper.startTransaction(async (client) => {
//   const users = await getUsersP(client);
//   const users2 = await getUsersP(client);
//   const users3 = await getUsersP(client);
//   return [users, users2, users3];
// }, (err, result) => {
//   console.log(err, result);
// })

pgHelper.queryWithTransaction([
  {
    cmd: 'update', table: 'client', key: 'up', data: { id: 1, department: 'x999' },
    options: { fields: ['id', 'department'] }
  },
  {
    cmd: 'select', table: 'client', key: 'sel',
    options: { filter: { id: 1 }, fields: ['id', 'department'] },
    preHandler: (self, key_result_, key_obj_) => {
      console.log('up------>>', key_result_.up);
    }
  },
], (err, result) => {
  console.log(err, result);
})
