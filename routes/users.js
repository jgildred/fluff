
// USER RESOURCE PREPROCESSOR

var app = require('../app');
var resource = require('./default');

// Preprocessor for GET /users
exports.find = function(req, res){
  if (HasAccess(req, res, 'Admin')) {
    resource.find(req, res, app.User);
  }
};

// Preprocessor for GET /users/:id
exports.findone = function(req, res){
  if (HasAccess(req, res, 'User')) {
    resource.findone(req, res, app.User);
  }
};

// Preprocessor for POST /users
exports.create = function(req, res){
  CleanParams(req, res);
  var crypto = require('crypto');
  req.body.salt = crypto.randomBytes(Math.ceil(10 * 3 / 4)).toString('base64').slice(0, 10);
  req.body.pwhash = crypto.createHash('md5').update(req.body.password + req.body.salt).digest("hex");
  req.body.verifytoken = encodeURIComponent(crypto.randomBytes(Math.ceil(10 * 3 / 4)).toString('base64').slice(0, 10));
  resource.create(req, res, app.User, SendVerifyEmail);
};

// Preprocessor for PUT /users/:id
exports.update = function(req, res){
  if (HasAccess(req, res, 'User')) {
    CleanParams(req, res);
    if (req.session.user_id == req.params.id) {
      resource.update(req, res, app.User, null, updateSession);
    }
    else {
      resource.update(req, res, app.User);
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

// Preprocessor for DELETE /users/:id
exports.remove = function(req, res){
  if (HasAccess(req, res, 'Admin')) {
    resource.remove(req, res, app.User);
  }
};

var HasAccess = function(req, res, level){
  if (req.session.auth && (req.session.status == 'Active')) {
    switch (level) {
    case 'User':
      if ((req.session.user_id == req.params.id)
        || ((req.session.role) && (req.session.role == 'Admin')))
      {        
        return true;
      }
      else {
        console.log("MUST BE CORRECT USER OR ADMIN");
        res.json({msg:'Must be correct user or admin.'});
        return false;
      }
      break;
    case 'Admin':
      if ((req.session.role) && (req.session.role == 'Admin')) {
        return true;
      }
      else {
        console.log("MUST BE ADMIN");
        res.json({msg:'Must be admin.'});
        return false;
      }
      break;
    default:
      return false;
    }
  }
  else {
    return false;
  }
}

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

var updateSession = function(req, res, user) {
  req.session.email   = user.email;
  req.session.role    = user.role;
  req.session.name    = user.displayname;
  console.log("SESSION UPDATED: " + JSON.stringify(req.session));
}

var SendVerifyEmail = function(req, res, user) {
  console.log("MAIL TO USER: " + JSON.stringify(user));
  var link = app.get('config').site_url + "#/verify/" + user.verifytoken;
  app.mailer.sendMail({
    from:    app.get('config').email_from,
    to:      user.email,
    subject: "Verify Your Email Address",
    text:    "Hi " + user.displayname + "\n\n" 
           + "In order to complete the signup process, please go to:\n\n" 
           + link + "\n"
  });
  app.mailer.close();
}
