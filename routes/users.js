
// USER RESOURCE PREPROCESSOR

var app = require('../app');
var resource = require('./resource');

// Preprocessor for GET /users
exports.find = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.find(req, res, app.User);
  }
};

// Preprocessor for GET /users/:id
exports.findone = function(req, res){
  if (app.HasAccess(req, res, 'Users')) {
    resource.findone(req, res, app.User);
  }
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
        req.body.password = randomString();
        var callback = SendNewResetEmail;
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
  var filter = { "verifytoken": encodeURIComponent(req.params.token) };
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
  if (req.body && req.body.password) {
    var password = req.body.password;
    req.body = {};
    req.body.salt = randomString();
    req.body.pwhash = saltyHash(password, req.body.salt);
  }
  // as the token is stored urlencoded, make sure it's not urldecoded
  var filter = { "verifytoken": encodeURIComponent(req.params.token) };
  resource.update(req, res, app.User, filter);
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
  req.body.salt = randomString();
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

var emailToUser = function(mailinfo) {
  if (mailinfo) {
    console.log("MAIL TO USER: " + JSON.stringify(mailinfo.user));
    app.mailer.sendMail({
      from:    app.App.get('config').email_from,
      to:      mailinfo.user.email,
      subject: mailinfo.subject,
      text:    mailinfo.body
    });
    app.mailer.close();
  }
}

var SendVerifyEmail = function(req, res, user) {
  if (user) {
    var link  = app.siteUrl + app.App.get('config').admin_path + "/#/verify/" + user.verifytoken;
    emailToUser({
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
    var link  = app.siteUrl + app.App.get('config').admin_path + "/#/pwchange/" + user.verifytoken;
    emailToUser({
      user: user,
      subject: "Request to Reset Your Password",
      body:    "Hi " + user.shortname + "\n\n" 
             + "We just received a request to reset your password. In order to do so, please go to:\n\n" 
             + link + "\n"
    });
  }
}

var SendNewResetEmail = function(req, res, user) {
  if (user) {
    var link  = app.siteUrl + app.App.get('config').admin_path + "/#/pwchange/" + user.verifytoken;
    emailToUser({
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

var randomString = function () {
  var crypto = require('crypto');
  return crypto.randomBytes(Math.ceil(10 * 3 / 4)).toString('base64').slice(0, 10);
}
exports.randomString = randomString;

var saltyHash = function (text, salt) {
  var crypto = require('crypto');
  return crypto.createHash('md5').update(text + salt).digest("hex");
}
exports.saltyHash = saltyHash;

var makeToken = function () {
  return encodeURIComponent(randomString());
}
exports.makeToken = makeToken;
