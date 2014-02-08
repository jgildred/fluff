
// PLUGTHING ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// Preprocessor for GET /plugthings
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of access control.
  // There is a good chance you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Admins', Plug.Plugthing, resource.find);
};

// Preprocessor for GET /plugthings/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Plugthing, resource.findone);
};

// Preprocessor for POST /plugthings
exports.create = function(req, res){
  // This is what it looks like when you have no access control.
  resource.create(req, res, Plug.Plugthing, callback);
};

// Preprocessor for PUT /plugthings/:id
exports.update = function(req, res){
  // This if statement is not required but illustrates another way to use access control. Note that any Admin can still gain access to resources that require 'Owner' level access control.
  if (app.HasAccess(req, res, 'Owner')) {
    resource.update(req, res, Plug.Plugthing, null, callback);
  }
};

// Preprocessor for DELETE /plugthings/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.remove(req, res, Plug.Plugthing, null, callback);
  }
};
