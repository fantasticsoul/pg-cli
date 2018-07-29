var DEFAULT_DB_NAME = 'default';

exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;

exports.isGeneratorFunction = function (obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
  else return false;
}

exports.isAsyncFunction = function (obj) {
  if (obj.__proto__ && obj.__proto__.constructor && obj.__proto__.constructor.name === 'AsyncFunction') return true;
  else return false;
}

exports.extractDbName = function (options) {
  if (options) {
    if (options.db) return options.db;
    if (options.client) return options.client.database;
    return DEFAULT_DB_NAME;
  } else return DEFAULT_DB_NAME;
}

exports.extractClient = function (options) {
  return options ? options.client : null;
}

exports.extractRows = function (options, cb) {
  return function (err, result) {
    if (err) {
      cb(err, result);
    } else {
      var onlyReturnRows = true;
      if (options && options.onlyRows === false) onlyReturnRows = false;
      if (onlyReturnRows) {
        cb(null, result.rows);
      } else {
        cb(null, result);
      }
    }
  }
}

exports.extractRowsForPromise = function (resolve, reject, options) {
  return function (err, result) {
    if (err) {
      reject(err);
    } else {
      var onlyReturnRows = true;
      if (options && options.onlyRows === false) onlyReturnRows = false;
      if (onlyReturnRows) {
        resolve(result.rows);
      } else {
        resolve(result);
      }
    }
  }
}

exports.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
}
