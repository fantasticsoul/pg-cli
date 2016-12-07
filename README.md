# pg-cli
a small but quite useful lib for postgres
一个基于node-pg( npm install pg )封装的更易用的pg客户端库

# 按照自己给定的配置初始化一个postgres客户端助手
```
var pgHelper = require('pg-cli').pgHelper;
var pgConf = {
      user: 'postgres',
      database: 'test',
      password: '123456',
      host:'localhost',
      port: 5432,
      max: 10, // max number of clients in pool
      min: 4,
      idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
}
pgHelper.initPool(pgConf);
```

# 执行原生sql语句
```
pgHelper.query('select * from "User" where "name"=$1', ['admin'], (err, reply)=>{
    if(err) console.log(err);// err coming from pg
    console.log(reply.rows);//data set
    console.log(reply.rowCount);//data count
});
```

# 简单的select查询
* 在User表里查询name等于admin的数据集
```
pgHelper.select('User', {name:'admin'}, [], (err, reply)=>{
    //your code here
});
pgHelper.select('User', {name:{'$eq':'admin'}}, [], (err, reply)=>{
    //your code here
});
```

* 在User表里查询name等于admin的数据集,返回的数据里只包含name,age,class 3个字段
```
pgHelper.select('User', {name:{'$eq':'admin'}}, ['name','age','class'], (err, reply)=>{
    //your code here
});
```

* 在User表里查询name等于admin的数据集,并返回
```
pgHelper.select('User', {name:'admin'}, [], (err, reply)=>{
    //your code here
});
pgHelper.select('User', {name:{'$eq':'admin'}}, [], (err, reply)=>{
    //your code here
});
```

* 在User表里查询name不等于admin的数据集
```
pgHelper.select('User', {name:{'$ne':'admin'}}, [], (err, reply)=>{
    //your code here
});
```

## 各种$操作符映射的sql操作符{'$gte': '>=', '$gt': '>', '$eq': '=', '$lte': '<=', '$lt': '<', '$ne': '!=', '$in': 'in', '$like': 'like'}


# 插入操作
* 向User表插入一条数据
```
var toInsert = {name:'admin',age:22,class:19,addr:'BeiJing'};
pgHelper.insert('User', toInsert, (err, reply)=>{
    //your code here
});
```

* 向User表插入多条数据
```
var toInsertBatch = [{name:'admin',age:22,class:19,addr:'BeiJing'},{name:'admin2',age:29,class:15,addr:'ShangHai'}];
pgHelper.insertBatch('User', toInsertBatch, (err, reply)=>{
    //your code here
});
```

# 更新操作
* 更新User表中id为1的对象的age字段值为100
```
pgHelper.update('User', {id:1}, {age:100}, (err, reply)=>{
    //your code here
});
```

# 删除操作
* 删除User表中id为1的对象
```
pgHelper.remove('User', {id:1}, (err, reply)=>{
    //your code here
});
```


# 事务操作
* 先删除User表里满足id为1的数据,
* 然后删除Score表里满足class为19的数据,
* 然后向User表里添加一条数据,
* 然后从Score表里选择出满足class为15的数据集,
* 然后从这些class为15的数据集里挑出score>80的数据,插入到Log表里

```
//开始构建事务操作的一组操作对象
var selectUser = {'$select':{table:'User', filter:{id:1}, key:'selectUser'}};
var removeScore19 = {'$remove':{table:'Score', filter:{class:19}, key:'removeScore19'}};
var addOneUser = {'$insert':{table:'User', toInsert:{name:'admin',age:22,class:19,addr:'BeiJing'}, key:'addOneUser'}};
var selectScore15 = {'$select':{table:'Score', filter:{class:19}, key:'selectScore15'}};
var toLog = {'$insertBatch':{table:'Log', toInsertBatch:[], key:'toLog', preHandler: (selfOP, results, OPMap)=>{
    //selfOP指向当前这个操作对象自己: {table:'Log', toInsertBatch:[], key:'toLog' ......}
    //results收集前面已经执行好的结果: {selectUser: <result>, removeScore19:<result>, addOneUser:<result>, selectScore15:<result>}
    //OPMap是前面所有的操作对象map: {selectUser: <operation body for selectUser>, removeScore19:<operation body for removeScore19>, ......}
    var selectScore15Ret = results.selectScore15.rows;
    selfOP.toInsertBatch = selectScore15Ret;
}}};

var operationArr = [selectUser, removeScore19, addOneUser, selectScore15, toLog];
//queryWithTransaction会按序执行这些操作对象,中间任何一个失败,事务都会回滚
pgHelper.queryWithTransaction(operationArr, (err, results)=>{
    //results收集的是所有已执行好的结果: {selectUser: <result>, removeScore19:<result>, addOneUser:<result>, selectScore15:<result>, toLog:<toLog>}
    //your code here
});
```





