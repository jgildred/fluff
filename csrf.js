
var app = require('./app');

function defaultValue(req) {
  return (req.body && req.body._csrf)
    || (req.query && req.query._csrf)
    || (req.headers['x-csrf-token']);
}
var checkToken = function(req, res, next){
    var apikey = req.session.apikey;
    var token = req.session._csrf || (req.session._csrf = app.randomString(24));
    var val = defaultValue(req);
    console.log("CSRF on server:   " + token);
    console.log("CSRF from client: " + val);
    if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) { return next(); }
    // allow signup, verify, pwreset, pwchange, and login without csrf
    var bypass = false;
    if (
      (
        (req.method == 'POST')
        && (
          (req.path == (app.App.get('config').fluff_path + '/admin/api/users'))
          || (req.path == (app.App.get('config').fluff_path + '/admin/api/auth'))
          || (req.path == (app.App.get('config').fluff_path + '/admin/api/identities'))
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
      app.msgResponse(req, res, 400, "CSRF missing or incorrect.");
    }
    else {
      next();
    }
}
var newToken = function(req, res, next) {
  var token = req.session._csrf || (req.session._csrf = app.randomString(24));
  next();
}
module.exports = {
    check: checkToken,
    generate: newToken 
};