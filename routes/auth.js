
// AUTHENTICATION HANDLER

var app   = require('../app'),
    Fluff = app.Fluff;

// Response for GET
exports.check = function(req, res){
  if (req.session.auth) {
    var body  = authResponse(req);
  }
  else {
    var body = basicResponse(req);
  }
  res.json(body);
};

// Response for POST with email and password
exports.attach = function(req, res){
  Fluff.log.info("Authenticating a user...");
  if (req.body.email && req.body.password) {
    app.User.findOne({"email": req.body.email}).select("firstname lastname email role pwhash salt status").exec(function (err, user) {
      if (err || !user) {
        req.session.auth = false;
        res.status(401);
        var body = basicResponse(req);
        body.msg = err || 'User does not exist.';
      }
      else {
        Fluff.log.info("LOGIN FOUND USER: " + user.email);
        if (user.status == "Active") {
          if (user.pwMatch(req.body.password)) {
            Fluff.log.info("LOGIN USER " + user.displayname + ": " + user.email);
            req.session.auth    = true;
            req.session.human   = true;  // if it's a real user, then it's human
            req.session.user = {
              id          : user._id, 
              email       : user.email,
              role        : user.role,
              displayname : user.displayname,
              status      : user.status
            };
            var body = authResponse(req);
          }
          else {
            req.session.auth = false;
            res.status(401);
            var body = basicResponse(req);
            body.msg = "Password is incorrect.";
          }
        }
        else {
          req.session.auth = false;
          res.status(401);
          var body = basicResponse(req);
          body.msg = "Your account is not active. Please contact an administrator for help.";
        }
      }
      if (body.msg) {
        Fluff.log.info(body.msg);
      }
      res.json(body);
    });
  }
  else {
    req.session.auth = false;
    res.status(403);
    var body = basicResponse(req);
    body.msg = "Credentials are missing.";
    Fluff.log.info(body.msg);
    res.json(body);
  }
};

// Response for DELETE
exports.detach = function(req, res){
  if ((req.session.user.id == req.params.id) && (typeof req.session.user.email !== 'undefined')) {
    Fluff.log.info("LOGOUT: \n" + req.session.user.email);
  }
  // Logout by clearing the session
  req.session.regenerate(function(err){
    req.session.auth = false;
    req.session.user = null;
    var body = basicResponse(req);
    res.json(body);
  });
};

// Handler for POST /captcha
exports.captcha = function(req, res){
  Fluff.checkCaptcha(req, res, function (req, res, verified) {
    // If the site config has no captcha setting, then assumed not required
    if (verified) {
      var msg = "Captcha verified..";
      req.session.human = true;
    }
    else {
      var msg = "Captcha not verified.";
      req.session.human = false;
      res.status(401);
    }
    var body = basicResponse(req);
    body.msg = msg;
    Fluff.log.info(body.msg);
    res.json(body);
  });
};

var authResponse = function (req) {
  var body   = basicResponse(req);
  body._id   = req.session.id,
  body.user  = req.session.user;
  return body;
};

var basicResponse = function (req) {
  return {
    auth    : req.session.auth,
    human   : req.session.human,
    _csrf   : req.session.human ? req.session._csrf : '',
    site    : {
      name            : Fluff.app.get('config').name,
      fluff_path      : Fluff.app.get('config').fluff_path,
      apikey  : {
        required      : Fluff.app.get('config').apikey.required
      },
      captcha : {
        required      : Fluff.app.get('config').captcha.required,
        recaptcha_key : Fluff.app.get('config').captcha.recaptcha_public_key
      }
    }
  }
};
