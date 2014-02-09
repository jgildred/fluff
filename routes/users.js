
// USER RESOURCE PREPROCESSOR

var app      = require('../app'),
    Fluff    = app.Fluff,
    resource = require('./resource');

// Preprocessor for GET /users
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', app.User, resource.find);
};

// Preprocessor for GET /users/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', app.User, resource.findone);
};

// Preprocessor for POST /users
exports.create = function(req, res){
  if (req.body.role || req.body.status) {
    if (app.HasAccess(req, res, 'Admins')) {
      if (req.body.password) {
        var callback = SendVerifyEmail;
      }
      else {
        // if password not supplied, then make one up and force reset
        req.body.password = app.randomString();
        var callback = SendWelcomeEmail;
      }
      doCreate(req, res, callback);
    }
  }
  else {
    doCreate(req, res, SendVerifyEmail);
  }
};

// Preprocessor for PUT /users/:id
exports.update = function(req, res){
  if (req.body.role || req.body.status) {
    if (app.HasAccess(req, res, 'Admins')) {
      if ((req.body.role == 'User') || (req.body.status == 'Inactive')) {
        doIfNotLastAdmin(req, res, req.params.id, doUpdate);
      }
      else {
        doUpdate(req, res);
      }
    }
  }
  else {
    if (app.HasAccess(req, res, 'Users')) {
      doUpdate(req, res);
    }
  }
};

// Preprocessor for PUT /verify/:token
exports.verify = function(req, res){
  req.body = { "status": "Active" };
  // as the token is stored urlencoded, make sure it's not urldecoded
  var token = encodeURIComponent(req.params.token).replace(".", "%2E");
  var filter = { "verifytoken": token };
  resource.update(req, res, app.User, filter);
};

// Preprocessor for POST /pwreset/:email
exports.pwreset = function(req, res){
  if (req.params.email) {
    var filter = {email: req.params.email, status: "Active" };
    resource.findone(req, res, app.User, filter, SendResetEmail);
    res.json({msg:"Password reset instructions sent to " + req.params.email + "."});
  }
  else {
    app.msgResponse(req, res, 400, "Email address is missing from your request.");
  }
};

// Preprocessor for PUT /pwchange/:token
exports.pwchange = function(req, res){
  console.log(req.body);
  if (req.body && req.body.password) {
    var password = req.body.password;
    req.body = {};
    req.body.salt = app.randomString();
    req.body.pwhash = saltyHash(password, req.body.salt);
    console.log('created pwhash: ' + req.body.pwhash);
  }
  // as the token is stored urlencoded, make sure it's not urldecoded
  var token = encodeURIComponent(req.params.token).replace(".", "%2E");
  var filter = { "verifytoken": token };
  console.log(req.body);
  resource.update(req, res, app.User, filter, function(user) {
    console.log('new pwhash: ' + user.pwhash);
  });
};

// Preprocessor for DELETE /users/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    doIfNotLastAdmin(req, res, req.params.id, resource.remove);
  }
};

// Remove unwanted fields in the request object
var CleanParams = function(req, res) {
  console.log("CLEAN PARAMS...");
  if (req.body.pwhash) {
    delete req.body.pwhash;
  }
  if (req.body.salt) {
    delete req.body.salt;
  }
  if (req.body.role) {
    delete req.body.role;
  }
  if (req.body.verifytoken) {
    delete req.body.verifytoken;
  }
}

var doCreate = function(req, res, callback) {
  CleanParams(req, res);
  req.body.salt = app.randomString();
  req.body.pwhash = saltyHash(req.body.password, req.body.salt);
  req.body.verifytoken = makeToken();
  resource.create(req, res, app.User, callback);
}

var doUpdate = function(req, res) {
  CleanParams(req, res);
  var callback = null;
  if (req.session.user_id == req.params.id) {
    callback = updateSession;
  }
  resource.update(req, res, app.User, null, callback);
};

var updateSession = function(req, res, user) {
  if (user) {
    req.session.email   = user.email;
    req.session.role    = user.role;
    req.session.name    = user.displayname;
    console.log("SESSION UPDATED: " + JSON.stringify(req.session));
  }
}

var SendVerifyEmail = function(req, res, user) {
  if (user) {
    var link  = Fluff.app.siteUrl + Fluff.app.get('config').fluff_path + "/admin/#/verify/" + user.verifytoken;
    Fluff.emailToUser({
      user: user,
      subject: "Verify Your Email Address",
      body:    "Hi " + user.shortname + "\n\n" 
             + "In order to complete the signup process, please go to:\n\n" 
             + link + "\n"
    });
  }
}

var SendResetEmail = function(req, res, user) {
  if (user) {
    var link  = Fluff.app.siteUrl + Fluff.app.get('config').fluff_path + "/admin/#/pwchange/" + user.verifytoken;
    Fluff.emailToUser({
      user: user,
      subject: "Request to Reset Your Password",
      body:    "Hi " + user.shortname + "\n\n" 
             + "We just received a request to reset your password. In order to do so, please go to:\n\n" 
             + link + "\n"
    });
  }
}

var SendWelcomeEmail = function(req, res, user) {
  if (user) {
    var link  = Fluff.app.siteUrl + Fluff.app.get('config').fluff_path + "/admin/#/pwchange/" + user.verifytoken;
    Fluff.emailToUser({
      user: user,
      subject: "Your Account is Ready",
      body:    "Hi " + user.shortname + "\n\n" 
             + "We just setup a new user account for you. In order to complete the setup process, please go to:\n\n" 
             + link + "\n"
    });
  }
}

// make sure it's not the last admin
var doIfNotLastAdmin = function (req, res, user_id, callback) {
  if (user_id && callback) {
    app.User.findById(user_id).exec(function (err, user) {
      if (user) {
        if (user.role == "Admin") {
          app.User.count({role: "Admin"}).exec(function (err, count) {
            if (!err && (count > 1)) { 
              console.log("more than one admin left");
              callback(req, res, app.User);
            }
            else {
              app.msgResponse(req, res, 403, "Sorry, you can't remove or disable the last admin.");
            }
          });
        }
        else {
          console.log("ok to delete non-admin");
          callback(req, res, app.User);
        }
      }
      else {
        app.msgResponse(req, res, 404, "The user cannot be found.");
      }
    });
  }
}

var saltyHash = function (text, salt) {
  var crypto = require('crypto');
  return crypto.createHash('md5').update(text + salt).digest("hex");
}
exports.saltyHash = saltyHash;

var makeToken = function () {
  return encodeURIComponent(app.randomString()).replace(".", "%2E");
}
exports.makeToken = makeToken;

// Handler for POST /captcha
exports.captcha = function(req, res){
  var ra = require('recaptcha-async');
  var recaptcha = new ra.reCaptcha();
  recaptcha.on('data', function (response) {
    if(response.is_valid) {
      console.log("Captcha verified.");
      req.session.human = true;
      var body = {
        auth  : req.session.auth || false;
        human : req.session.human;
        _csrf : req.session._csrf;
      };
      app.json(body);
    }
    else {
      console.log("Captcha invalid.");
      req.session.human = false;
      app.msgResponse(req, res, 403, "That's not the captcha.");
      //html = recaptcha.getCaptchaHtml(mypublickey, res.error);
    }
  });
  recaptcha.checkAnswer(Fluff.reCaptchaPrivateKey, 
    req.connection.remoteAddress, 
    req.body.recaptcha_challenge_field, 
    req.body.recaptcha_response_field);
}
