
#  1.0.7 - 2017-04-11
## 支持jsonSet函数，要求pg-server版本>=9.5
## 修复bug，updateBatch函数更新jsonb字段时报错
## 重新整理的函数api，让其参数顺序和sql语句一致, 为update和insert 函数加入returnFields参数，支持返回指定的字段
## 调整后顺序为：
## select(tableName, selectedFields, filter, cb)
## update(tableName, toUpdate, filter, returnFields, cb)
## insert(tableName, toInsert, returnFields, cb)
## 该调整为破坏性变更，1.0.6之前调用的函数请修改一下

#  1.0.6 - 2017-03-13
## 去掉一些多余的try catch

#  1.0.5 - 2017-03-12
## 增加批量更新的支持,用法参见READ ME

#  1.0.1 - 2016-12-07
## 补上README.md,简单介绍用法

#  1.0.0 - 2016-12-05
## 发布pg-cli





