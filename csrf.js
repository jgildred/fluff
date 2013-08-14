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
    var apikey = req.session.apikey;
    var token = req.session._csrf || (req.session._csrf = generateToken(24));
    var val = defaultValue(req);
    console.log("REQ " + req.method + ": " + req.path);
    console.log("REQ BODY: " + JSON.stringify(req.body));
    console.log("REQ HEADERS: " + JSON.stringify(req.headers));
    console.log("CSRF on server:   " + token);
    console.log("CSRF from client: " + val);
    if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) { return next(); }
    // allow signup, verify, pwreset, pwchange, and login without csrf
    var bypass = false;
    if (
      (
        (req.method == 'POST')
        && (
          (req.path == (server.App.get('config').fluff_path + '/admin/api/users'))
          || (req.path == (server.App.get('config').fluff_path + '/admin/api/auth'))
        )
      ) 
      || (
        (req.method == 'PUT')
        && (/\/admin\/api\/verify/i.test(req.path))
      ) 
      || (
        (req.method == 'PUT')
        && (/\/admin\/api\/pwreset/i.test(req.path))
      ) 
      || (
        (req.method == 'PUT')
        && (/\/admin\/api\/pwchange/i.test(req.path))
      ) 
    ) {
      bypass = true;
      console.log("CSRF NOT REQUIRED");
    }
    if ((val != token) && (!bypass)) {
      //return next({auth: false});
      server.msgResponse(req, res, 400, "CSRF missing or incorrect.");
    }
    else {
      next();
    }
}
var newToken = function(req, res, next) {
  var token = req.session._csrf || (req.session._csrf = generateToken(24));
  next();
}
module.exports = {
    check: checkToken,
    generate: newToken 
};