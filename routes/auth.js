
// AUTHENTICATION HANDLER

var app = require('../app');

// Response for GET
exports.check = function(req, res){
  if (req.session.auth) {
    console.log("AUTH OK.");
    var body = {
      auth    : req.session.auth,
      human   : req.session.human || false,
      _id     : req.session.id,
      _csrf   : req.session._csrf,
      site    : {
        name       : app.App.get('config').name,
        fluff_path : app.App.get('config').fluff_path,
        apikey    : {
          required : app.App.get('config').apikey.required
        }
      },
      user: {
        _id    : req.session.user_id,
        email  : req.session.email,
        role   : req.session.role,
        name   : req.session.name,
        status : req.session.status }
    };
  }
  else {
    console.log("AUTH BAD.");
    res.status(401);
    var body = {
      auth    : false,
      human   : req.session.human || false,
      status  : req.session.status
    };
  }
  res.json(body);
};

// Response for POST with email and password
exports.attach = function(req, res){
  console.log("Authenticating a user...");
  if (req.body.email && req.body.password) {
    app.User.findOne({"email": req.body.email}).select("firstname lastname email role pwhash salt status").exec(function (err, user) {
      if (err || !user) {
        var body = err || {msg: 'User does not exist.'};
        if (!user) {
          res.status(401);
        }
        console.log("LOGIN ERR: " + JSON.stringify(body));
      }
      else {
        console.log("LOGIN FOUND USER: " + JSON.stringify(user));
        if (user.status == "Active") {
          if (user.pwMatch(req.body.password)) {
            console.log("LOGIN USER " + user.displayname + ":" + JSON.stringify(user));
            req.session.auth    = true;
            req.session.human   = true;  // if it's a real user, then it's human
            req.session.user_id = user._id;
            req.session.email   = user.email;
            req.session.role    = user.role;
            req.session.name    = user.displayname;
            req.session.status  = user.status;
            req.session.site    = {
              name       : app.App.get('config').name,
              fluff_path : app.App.get('config').fluff_path,
              apikey    : {
                required : app.App.get('config').apikey.required
              }
            };
            var body = {
              auth     : req.session.auth,
              human    : req.session.human,
              _id      : req.session.id,
              _csrf    : req.session._csrf,
              site     : req.session.site,
              user: {
                _id    : req.session.user_id,
                email  : req.session.email,
                role   : req.session.role,
                name   : req.session.name,
                status : req.session.status }
            };
          }
          else {
            req.session.auth = false;
            res.status(400);
            var body = {
              auth: req.session.auth, 
              msg:  "Password is incorrect."};
          }
        }
        else {
          req.session.auth = false;
          res.status(401);
          var body = {
            auth:   req.session.auth,
            status: user.status, 
            msg:    "Your account is not active. Please contact an administrator for help."};
        }
      }
      res.json(body);
    });
  }
  else {
    req.session.auth = false;
    res.status(400);
    var body = {
      auth: false, 
      msg:  "Credentials are missing."};
    res.json(body);
  }
};

// Response for DELETE
exports.detach = function(req, res){
  if ((req.session.id == req.params.id) && (typeof req.session.email !== 'undefined')) {
    console.log("LOGOUT: \n" + req.session.email);
  }
  // Logout by clearing the session
  req.session.regenerate(function(err){
    // Generate a new csrf token so the user can login again
    // This is pretty hacky, connect.csrf isn't built for rest
    var csrf = require('../csrf');
    csrf.generate(req, res, function () {
      res.send({auth: false, _csrf: req.session._csrf});
    });
    req.session.auth = false;
  });
};
