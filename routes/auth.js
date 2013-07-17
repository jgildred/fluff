
// AUTHENTICATION HANDLER

var app = require('../app');

// Response for GET
exports.check = function(req, res){
  if (req.session.auth) {
    console.log("AUTH OK.");
    var body = {
      auth:    req.session.auth,
      _id:     req.session.id,
      user_id: req.session.user_id,
      email:   req.session.email,
      role:    req.session.role,
      name:    req.session.name,
      status:  req.session.status,
      _csrf:   req.session._csrf
    };
  }
  else {
    console.log("AUTH BAD.");
    res.status(401);
    var body = {
      auth:   false,
      status: req.session.status,
      _csrf:  req.session._csrf
    };
  }
  res.send(body);
};

// Response for POST with email and password
exports.attach = function(req, res){
  console.log("trying to auth");
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
            console.log("LOGIN USER: " + JSON.stringify(user));
            req.session.auth    = true;
            req.session.user_id = user._id;
            req.session.email   = user.email;
            req.session.role    = user.role;
            req.session.name    = user.displayname;
            req.session.status  = user.status;
            var body = {
              auth:    req.session.auth,
              _id:     req.session.id,
              user_id: req.session.user_id,
              email:   req.session.email,
              role:    req.session.role,
              name:    req.session.name,
              status:  req.session.status,
              _csrf:   req.session._csrf
            };
            console.log("LOGIN: " + user.displayname);
          }
          else {
            req.session.auth = false;
            app.msgResponse(req, res, 401, "Password is incorrect.");
          }
        }
        else {
          req.session.auth = false;
          app.msgResponse(req, res, 401, "Your account is disabled. Please contact an administrator.");
        }
      }
      res.send(body);
    });
  }
  else {
    var body = {msg: 'Credentials missing.'};
    res.send(body);
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
