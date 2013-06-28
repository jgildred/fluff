// TODO - Write a better csrf module

var crypto = require('crypto');
var server = require('./app');

var generateToken = function(len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
};
function defaultValue(req) {
  return (req.body && req.body._csrf)
    || (req.query && req.query._csrf)
    || (req.headers['x-csrf-token']);
}
var checkToken = function(req, res, next){
    var token = req.session._csrf || (req.session._csrf = generateToken(24));
    if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) { return next(); }
    var val = defaultValue(req);
    console.log("REQ HEADERS: " + JSON.stringify(req.headers));
    console.log("REQ " + req.method + ": " + req.path);
    console.log("REQ BODY: " + JSON.stringify(req.body));
    console.log("CSRF on server:   " + token);
    console.log("CSRF from client: " + val);
    // allow signup, verify and login without csrf
    var bypass = false;
    if (
      (req.method == 'GET')
      || (
        (req.method == 'POST')
        && (
          (req.path == (server.App.get('config').admin_path + '/api/users'))
          || (req.path == (server.App.get('config').admin_path + '/api/auth'))
        )
      ) 
      || (
        (req.method == 'PUT')
        && (/\/api\/verify/i.test(req.path))
      ) 
    ) {
      bypass = true;
      console.log("CSRF NOT REQUIRED");
    }
    if ((val != token) && (!bypass)) return next({auth: false});
    next();
}
var newToken = function(req, res, next) {
  var token = req.session._csrf || (req.session._csrf = generateToken(24));
  next();
}
module.exports = {
    check: checkToken,
    generate: newToken 
};