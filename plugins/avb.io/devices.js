
// DEVICE ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// Preprocessor for GET /devices
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of access control.
  // There is a good change you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Admins', Plug.Device, resource.find);
};

// Preprocessor for GET /devices/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Device, resource.findone);
};

// Preprocessor for GET /users/:id/devices
exports.findbyuser = function(req, res){
  if (HasAccess(req, res, 'admin')) {
    resource.find(req, res, app.Device, {"user_id": req.session.user.id});
  }
};

// Preprocessor for POST /devices
exports.create = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Device, resource.create);
};

// Preprocessor for PUT /devices/:id
exports.update = function(req, res){
  // This if statement is not required but illustrates another way to use access control. Note that any Admin can still gain access to resources that require 'Owner' level access control.
  if (app.HasAccess(req, res, 'Admins')) {
    resource.update(req, res, Plug.Device, null, callback);
  }
};

// Preprocessor for DELETE /devices/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.remove(req, res, Plug.Device, null, callback);
  }
};

// Preprocessor for POST /link/:uid
exports.link = function(req, res){
  if ((HasAccess(req, res, 'user')) && req.params.uid) {
    req.body = {};
    req.body.user_id = req.session.user.id;
    resource.update(req, res, app.Device, {"uid": req.params.uid, "user_id": null});
  }
};
