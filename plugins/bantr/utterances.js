
// UTTERANCES ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    schemas  = require('./schemas'),
    Plug     = require('./plug'),
    Bantr    = require('./bantr');

// Preprocessor for GET /utterances
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of access control.
  // There is a good change you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Admins', Plug.Utterance, resource.find);
};

// Preprocessor for GET /utterances/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Utterance, function(req, res) {
    var data = {
      schema_data     : schemaToData(schemas.utterance),
      display_columns : schemas.utterance_display_columns,
      sort_column     : schemas.utterance_sort_column
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
        schema_data += subitem + ": " + (itemObj[subitem].name ? itemObj[subitem].name : itemObj[subitem]) + ", ";
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

// Preprocessor for GET /utterances/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Utterance, resource.findone);
};

// Preprocessor for POST /utterances
exports.create = function(req, res){
  resource.create(req, res, Plug.Utterance, function(req, res, utterance) {
    // You would think that you should learn before you react, but then the reaction would be slow. May change later.
    Bantr.react(req, res, utterance, function(utterance, rules) {
      Bantr.learn(utterance, rules);
    });
  }, true);
};

// Preprocessor for PUT /utterances/:id
exports.update = function(req, res){
  // This if statement is not required but illustrates another way to use access control. Note that any Admin can still gain access to resources that require 'Owner' level access control.
  if (app.HasAccess(req, res, 'Owner')) {
    resource.update(req, res, Plug.Utterance);
  }
};

// Preprocessor for DELETE /utterances/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.remove(req, res, Plug.Utterance);
  }
};
