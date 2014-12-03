
// USER RESOURCE PREPROCESSOR

var app      = require('../app'),
    Fluff    = app.Fluff,
    resource = require('./resource');

var schema = "{ \n\
  firstname      : String,  \n\
  lastname       : String,  \n\
  orgname        : String,  \n\
  email          : { type: String, index: { unique: true } }, \n\
  verifytoken    : { type: String, unique: true }, \n\
  phone          : String, \n\
  role           : { type: String, enum: [ 'User', 'Admin' ], default: 'User', required: true }, \n\
  status         : { type: String, enum: [ 'Active', 'Inactive', 'Unverified' ], default: 'Unverified', required: true }, \n\
  notes          : String, \n\
  pwhash         : { type: String, required: true }, \n\
  salt           : { type: String, required: true }, \n\
  lastlogin      : Date,   \n\
  creator_id     : ObjectId, \n\
  lastupdater_id : ObjectId, \n\
  creation       : { type: Date, default: Date.now }, \n\
  lastupdate     : { type: Date, default: Date.now }  \n\
}";
exports.schema = schema;

var display_columns = [{
  name:  'firstname',
  title: 'First Name',
  size:  20
},
{
  name:  'lastname',
  title: 'Last Name',
  size:  20
},
{
  name:  'email',
  title: 'Email',
  size:  20
},
{
  name:  'role',
  title: 'Role',
  size:  20
},
{
  name:  'status',
  title: 'Status',
  size:  10
}];

var sort_column = { name:'lastname', order:true };

// Searchable fields
var match_fields = ['firstname', 'lastname', 'orgname', 'email'];
exports.match_fields = match_fields;

// Preprocessor for GET /users/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Public', app.User, function(){
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column,
      match_fields    : match_fields
    }
    res.json(data);
  });
};

// Preprocessor for GET /users
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', app.User, resource.find);
};

// Preprocessor for GET /users/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Users', app.User, resource.findone);
};

// Preprocessor for POST /users
exports.create = function(req, res){
  var level = Fluff.app.get('config').captcha.required ? 'Humans' : 'Public';
  // Must be human as in a user or captcha verified anonymous
  app.doIfHasAccess(req, res, level, app.User, function () {
    if (req.body.email) {
      // Check to see if email already used
      app.User.findOne({email:req.body.email}).exec(function (err, user) {
        if (!user) {
          if (req.body.password) {
            // If password included, then assume created by anonymous human
            var callback = SendNotificationEmail;
            var options = {slug: 'signup'};
          }
          else {
            // if password not supplied, then assume created by admin
            req.body.password = app.randomString();
            var callback = SendNotificationEmail;
            var options = {slug: 'welcome'};
          }
          if (req.body.role || req.body.status) {
            if (app.HasAccess(req, res, 'Admins')) {
              doCreate(req, res, callback, options);
            }
            else {
              Fluff.msgResponse(req, res, 403, "You cannot set role and status.");
            }
          }
          else {
            doCreate(req, res, callback, options);
          }
        }
        else {
          Fluff.msgResponse(req, res, 403, "Email is already in use.");
        }
        if (err) {
          Fluff.msgResponse(req, res, 500, "Error during user lookup.");
        }
      });
    }
    else {
      Fluff.msgResponse(req, res, 403, "Email is required.");
    }
  });
};

// Preprocessor for PUT /users/:id
exports.update = function(req, res){
  // Must be a user to update any user
  app.doIfHasAccess(req, res, 'Users', app.User, function () {
    if (req.body.role || req.body.status) {
      if (app.HasAccess(req, res, 'Admins')) {
        if ((req.body.role == 'User') || (req.body.status == 'Inactive')) {
          doIfNotLastAdmin(req, res, req.params.id, doUpdate);
        }
        else {
          doUpdate(req, res);
        }
      }
      else {
        app.msgResponse(req, res, 400, "You cannot set role and status.");
      }
    }
    else {
      doUpdate(req, res);
    }
  });
};

// Preprocessor for PUT /verify/:token
exports.verify = function(req, res){
  req.body = { "status": "Active" };
  // as the token is stored urlencoded, make sure it's not decoded
  var token = encodeURIComponent(req.params.token).replace(".", "%2E");
  var filter = { "verifytoken": token };
  resource.update(req, res, app.User, filter, function () {
    res.json({msg: "Your email has been verified."});
  }, true);
};

// Preprocessor for PUT /pwreset/:email
exports.pwreset = function(req, res){
  if (req.params.email) {
    var filter = {email: req.params.email, status: "Active" };
    app.User.findOne(filter).exec(function (err, data) {
      if (err) {
        app.msgResponse(req, res, 500, JSON.stringify(err));
      }
      else {
        if (data) {
          SendNotificationEmail(req, res, data, {slug: 'pwchange'});
          res.json({msg:"Password reset instructions sent to " + req.params.email + "."});
        }
        else {
          res.json({msg:"Can't find user " + req.params.email + "."});
        }
      }
    });
  }
  else {
    app.msgResponse(req, res, 400, "Email address is missing from your request.");
  }
};

// Preprocessor for PUT /pwchange/:token
exports.pwchange = function(req, res){
  Fluff.log.info(req.body);
  if (req.body && req.body.password) {
    var password = req.body.password;
    req.body = {};
    req.body.salt = app.randomString();
    req.body.pwhash = saltyHash(password, req.body.salt);
    Fluff.log.info('created pwhash: ' + req.body.pwhash);
  }
  // As the token is stored urlencoded, make sure it's not urldecoded
  var token = encodeURIComponent(req.params.token).replace(".", "%2E");
  var filter = { "verifytoken": token };
  Fluff.log.info(req.body);
  // Reset the user token so the old one can't be reused
  req.body.verifytoken = makeToken();
  resource.update(req, res, app.User, filter, function(user) {
    Fluff.log.info('new pwhash: ' + user.pwhash);
    Fluff.log.info('new token: ' + user.verifytoken);
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
  Fluff.log.info("CLEAN PARAMS...");
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

var doCreate = function(req, res, callback, options) {
  CleanParams(req, res);
  req.body.password = null;
  req.body.confirmPassword = null;
  req.body.salt = app.randomString();
  req.body.pwhash = saltyHash(req.body.password, req.body.salt);
  req.body.verifytoken = makeToken();
  resource.create(req, res, app.User, callback, null, options);
}

var doUpdate = function(req, res, options) {
  CleanParams(req, res);
  var callback = null;
  if (req.session.user.id == req.params.id) {
    callback = updateSession;
  }
  resource.update(req, res, app.User, null, callback, null, options);
};

var updateSession = function(req, res, user) {
  if (user) {
    req.session.user.email       = user.email;
    req.session.user.role        = user.role;
    req.session.user.displayname = user.displayname;
    Fluff.log.info("SESSION UPDATED: " + JSON.stringify(req.session));
  }
}

// This happens when a new user signs up
var SendNotificationEmail = function(req, res, user, options) {
  if (user && options) {
    switch (options.slug) {
      case 'signup':
        var path = '/admin/#/verify/' + user.verifytoken;
        break;
      case 'pwchange':
        var path = '/admin/#/pwchange/' + user.verifytoken;
        break;
      case 'welcome':
        var path = '/admin/#/pwchange/' + user.verifytoken;
        break;
    }
    var link  = Fluff.externalBaseUrl + Fluff.app.get('config').fluff_path + path;
    var notification = Fluff.app.get('config').notifications.filter(function (item) {
      if (item.slug == options.slug) { return item }
    });
    if (notification && (notification.length > 0)) {
      Fluff.emailToUser({
        user: user,
        subject: notification[0].subject,
        body:    notification[0].body
                  .replace('{{displayname}}', user.displayname)
                  .replace('{{shortname}}', user.shortname)
                  .replace('{{firstname}}', user.firstname)
                  .replace('{{lastname}}', user.lastname)
                  .replace('{{orgname}}', user.orgname)
                  .replace('{{email}}', user.email)
                  .replace('{{verifytoken}}', user.verifytoken)
                  .replace('{{link}}', link)
      });
    }
    else {
      Fluff.log.info('No suitable notification template for ' + options.slug);
    }
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
              Fluff.log.info("more than one admin left");
              callback(req, res, app.User);
            }
            else {
              app.msgResponse(req, res, 403, "Sorry, you can't remove or disable the last admin.");
            }
          });
        }
        else {
          Fluff.log.info("ok to delete non-admin");
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
