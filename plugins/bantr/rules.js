
// RULES ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    schemas  = require('./schemas'),
    Plug     = require('./plug');

// Preprocessor for GET /rules
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of access control.
  // There is a good change you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, resource.find);
};

// Preprocessor for GET /rules/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Rule, function(req, res) {
    var data = {
      schema_data     : schemaToData(schemas.rule),
      display_columns : schemas.rule_display_columns,
      sort_column     : schemas.rule_sort_column
    }
    res.json(data);
  });
};

function schemaToData (schema) {
  var schema_data = "{\n";
  for (item in schema) {
    if (schema[item].type) {
      schema_data += item + ": { ";
      var itemObj = schema[item]
      for (subitem in itemObj) {
        schema_data += subitem + ": " + (itemObj[subitem].name ? itemObj[subitem].name : JSON.stringify(itemObj[subitem])) + ", ";
      }
      schema_data = schema_data.substr(0, schema_data.length - 3); // fix
      schema_data += " },\n";
    }
    else {
      schema_data += item + ": " + schema[item].name + ",\n";
    }
  }
  schema_data += "}";
  return schema_data;
}

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
  if (app.HasAccess(req, res, 'Owner')) {
    resource.update(req, res, Plug.Rule);
  }
};

// Preprocessor for DELETE /rules/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.remove(req, res, Plug.Rule);
  }
};
