# pg-cli
a small but quite useful lib for postgres
一个基于node-pg( npm install pg )封装的更易用的pg客户端库

* 暴露callbakc api、thunk api、promise api，方便自行选择
* 支持初始化多个数据库的连接池
* 支持单数据库事务和多数据库事务

## 按照自己给定的配置初始化一个postgres客户端助手
```
var pgHelper = require('pg-cli');
var pgConf = {
  user: 'postgres',
  database: 'test',
  password: '123456',
  host:'localhost',
  port: 5432,
  max: 10, // max number of clients in pool
  min: 4,
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
}
pgHelper.initPool(pgConf);
```

## 执行原生sql语句
```
pgHelper.query('select * from "User" where "name"=$1', ['admin'], (err, reply)=>{
    if(err) console.log(err);// err coming from pg
    console.log(reply.rows);//data set
    console.log(reply.rowCount);//data count
});
```

## 简单的select查询
* 在User表里查询name等于admin的数据集
```
pgHelper.select('User', [], {name:'admin'},(err, reply)=>{
    //your code here
});
pgHelper.select('User', [], {name:{'$eq':'admin'}}, (err, reply)=>{
    //your code here
});
```

* 在User表里查询name等于admin的数据集,返回的数据里只包含name,age,class 3个字段
```
pgHelper.select('User', ['name','age','class'], {name:{'$eq':'admin'}},  (err, reply)=>{
    //your code here
});
```

* 在User表里查询name等于admin的数据集,并返回
```
pgHelper.select('User', [], {name:'admin'}, (err, reply)=>{
    //your code here
});
pgHelper.select('User', [], {name:{'$eq':'admin'}}, (err, reply)=>{
    //your code here
});
```

* 在User表里查询name不等于admin的数据集
```
pgHelper.select('User', [], {name:{'$ne':'admin'}}, (err, reply)=>{
    //your code here
});
```

* 在User表里查询age>=13 且 <=19，和性别为男 数据集
```
pgHelper.select('User', [], {age:{'$gte':13,'$lte':19},sex:'male'}, (err, reply)=>{
    //your code here
});
```

### 各种$操作符映射的sql操作符{'$gte': '>=', '$gt': '>', '$eq': '=', '$lte': '<=', '$lt': '<', '$ne': '!=', '$in': 'in', '$like': 'like'}


## 插入操作
* 向User表插入一条数据
```
var toInsert = {name:'admin',age:22,class:19,addr:'BeiJing'};
pgHelper.insert('User', toInsert, [], (err, reply)=>{
    //your code here
});
```

* 向User表插入多条数据
```
var toInsertBatch = [{name:'admin',age:22,class:19,addr:'BeiJing'},{name:'admin2',age:29,class:15,addr:'ShangHai'}];
pgHelper.insertBatch('User', toInsertBatch, [], (err, reply)=>{
    //your code here
});
```

## 更新操作
* 更新User表中id为1的对象的age字段值为100
```
pgHelper.update('User', {age:100}, {id:1}, [], (err, reply)=>{
    //your code here
});
```

## 批量更新操作
* 更新User表中id为5，6，7的3行数据，where子句中匹配的属性为id，更新完毕后返回这些被更新行的'id','name','age','email'数据
```
pgHelper.updateBatch('User', [{id:4,age:12},{id:5,age:18},{id:6,age:19,name:'nick'}], 'id', ['id','name','age','email'], (err, reply)=>{
    //your code here
});
//生成的sql形如:
update "User" set 
"age" = case id when 4 then 12 when 5 then 18 when 6 then 19 end, 
"name" = case id when 6 then 'nick' end 
where "id" in(4,5,6) returning "id", "name", "age", "email"
```
* 把所有grade为2的数据的age更新为15，把所有grade为3的数据的age更新为19，更新完毕后返回这些被更新行的'id','name','age','email'数据
```
pgHelper.updateBatch('User', [{grade:2,age:15},{grade:3,age:19}], 'grade', ['id','name','age','email'], (err, reply)=>{
    //your code here
});
//生成的sql形如:
update "User" set "age" = case grade when 2 then 15 when 3 then 19 end where "grade" in(2,3) 
returning "id", "name", "age", "email"
```
* 跟新User表中id为1的行数据下的info字段，info为一个jsonb结构，{money:22,card:5,warehouse:{type:2,items:[{name:'sword',hp:200}]}},
* 只更新type 2 为 3
```
var jsonbSet = pgHelper.jsonbSet;

pgHelper.update('User', {info:jsonbSet([{path:['warehouse','type'],value:3}])}, {id:1}, [], (err, reply)=>{
    //your code here
});
//生成的sql形如:
update "User" set "info" = jsonb_set("info",'{"warehouse","type"}',3) where "id" = 1;
```
* 跟新User表中id为1的行数据下的info字段，info为一个jsonb结构，{money:22,card:5,warehouse:{type:2,items:[{name:'sword',hp:200}]}},
* 更新type 2 为 3, 同时也更新 items[0]的name为sheild
```
var jsonbSet = pgHelper.jsonbSet;
//和path value 平级的还有一个字段:createMissing,不传的话走pg默认的规则true
var infoJsonb = jsonbSet([{path:['warehouse','type'],value:3},{path:['warehouse','items',0,'name'],value:'shield'}]);
pgHelper.update('User', {info:infoJsonb}, {id:1}, [], (err, reply)=>{
    //your code here
});
//生成的sql形如:
update "User" set "info" = jsonb_set(jsonb_set("info",'{"warehouse","type"}',3),'{"warehouse","items",0,"name"}','shield') where "id" = 1;
```
* jsonb_set具体操作可参考官网

## 删除操作
* 删除User表中id为1的对象
```
pgHelper.remove('User', {id:1}, (err, reply)=>{
    //your code here
});
```


## 事务操作
* 先删除User表里满足id为1的数据,
* 然后删除Score表里满足class为19的数据,
* 然后向User表里添加一条数据,
* 然后从Score表里选择出满足class为15的数据集,
* 然后从这些class为15的数据集里挑出score>80的数据,插入到Log表里

```
//开始构建事务操作的一组操作对象,关于构建操作对象可参考api说明
//包括了: $select,$update,$insert,$remove,$insertBatch,$rawSql
var selectUser = {'$select': {table: 'User', filter: {id: 1}, key: 'selectUser'}};
var removeScore19 = {'$remove': {table: 'Score', filter: {class: 19}, key: 'removeScore19'}};
var addOneUser = {
  '$insert': {
    table: 'User',
    toInsert: {name: 'admin', age: 22, class: 19, addr: 'BeiJing'},
    key: 'addOneUser'
  }
};
var selectScore15 = {'$select': {table: 'Score', filter: {class: 19}, key: 'selectScore15'}};
var toLog = {
  '$insertBatch': {
    table: 'Log', toInsertBatch: [], key: 'toLog', preHandler: (selfOP, results, OPMap)=> {
      //selfOP指向当前这个操作对象自己: {table:'Log', toInsertBatch:[], key:'toLog' ......}
      //results收集前面已经执行好的结果: {selectUser: <result>, removeScore19:<result>, addOneUser:<result>, selectScore15:<result>}
      //OPMap是前面所有的操作对象map: {selectUser: <operation body for selectUser>, removeScore19:<operation body for removeScore19>, ......}
      var selectScore15Ret = results.selectScore15.rows;
      selfOP.toInsertBatch = selectScore15Ret;
    }
  }
};

var operationArr = [selectUser, removeScore19, addOneUser, selectScore15, toLog];
//queryWithTransaction会按序执行这些操作对象,中间任何一个失败,事务都会回滚
pgHelper.queryWithTransaction(operationArr, (err, results)=> {
  //results收集的是所有已执行好的结果: {selectUser: <result>, removeScore19:<result>, addOneUser:<result>, selectScore15:<result>, toLog:<toLog>}
  //your code here
});
```

## 使用promise 或者 thunk，执行多数据事务提交
```
//把grade为2的所有用户age改为18
const { $apiPromise:ap } = require('pg-cli');
var conf1 = {
  user: 'financeuser',
  password: 'financeuserpwd',
  host:'localhost',
  port: 5432,
  database: 'zzk',
  max: 10,
  min: 4,
  idleTimeoutMillis: 30000
};
var conf2 = {
  user: 'financeuser',
  password: 'financeuserpwd',
  host:'localhost',
  port: 5432,
  database: 'game',
  max: 10,
  min: 4,
  idleTimeoutMillis: 30000
};
ap.initPool(conf1);
ap.initPool(conf2);

async function main() {
  const user1 = await hp.select(User, { filter: { id: 1 }, fields: ['id', 'balance'] });
  const user2 = await hp.select(User, { filter: { id: 1 } });
  const matrix = await hp.select(Matrix, { filter: { id: 1 }, db: 'game' });

  await hp.startMultiDbTransaction(async function(clientMap){
    const user = await hp.select(User, { client:clientMap.zzk, filter: { id: 1 }, fields: ['id', 'balance'] });
    const matrix = await hp.select(Matrix, { client:clientMap.game, filter: { id: 1 } });
    console.log(user, matrix);
  });
  console.log('end startMultiDbTransaction');
}

main().catch(err=>console.log(err));

```






