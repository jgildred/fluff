
// RULES ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    schemas  = require('./schemas'),
    Plug     = require('./plug');

// Preprocessor for GET /rules
exports.find = function(req, res){
  req.query.sort = 'creation-desc';
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, resource.find);
};

// Preprocessor for GET /rules/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, function(req, res) {
    var data = {
      schema_data     : schemas.rule,
      display_columns : schemas.rule_display_columns,
      sort_column     : schemas.rule_sort_column
    }
    res.json(data);
  });
};

// Preprocessor for GET /rules/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, resource.findone);
};

// Preprocessor for POST /rules
exports.create = function(req, res){
  // This is what it looks like when you have no access control.
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, resource.create);
};

// Preprocessor for PUT /rules/:id
exports.update = function(req, res){
  // This if statement is not required but illustrates another way to use access control. Note that any Admin can still gain access to resources that require 'Owner' level access control.
  if (app.HasAccess(req, res, 'Owner', Plug.Rule)) {
    resource.update(req, res, Plug.Rule);
  }
};

// Preprocessor for DELETE /rules/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins', Plug.Rule)) {
    resource.remove(req, res, Plug.Rule);
  }
};
