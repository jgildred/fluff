
// PLUGTHING ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    Plug     = require('./plug'),
    resource = require('../../routes/resource');

// This is the schema for Plugthings
var schema = "{\n\
  user_id        : ObjectId,                          // The owner.\n\
  name           : String,                            // The name.\n\
  image          : String,                            // URL to an image.\n\
  creator_id     : ObjectId,                          // Required by Fluff.\n\
  lastupdater_id : ObjectId,                          // Required by Fluff.\n\
  creation       : { type: Date, default: Date.now }, // Required by Fluff.\n\
  lastupdate     : { type: Date, default: Date.now }  // Required by Fluff.\n\
}";

// This is the default set of columns to display in a UI
var display_columns = [{
  name:  'user_id',
  title: 'User ID',
  size:  20
},
{
  name:  'name',
  title: 'Name',
  size:  20
},
{
  name:  'image',
  title: '',
  type: 'image',
  size:  20
}];

// This is the default sort
var sort_column = { name:'name', order:true };

// These are used in plug.js
exports.match_fields = ['name'];
exports.schema = schema;

// Preprocessor for GET /plugthings/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Plugthing, function(req, res) {
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column
    }
    res.json(data);
  });
};

// Preprocessor for GET /plugthings
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of Fluff access control.
  // There is a good chance you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Owner', Plug.Plugthing, resource.find);
};

// Preprocessor for GET /plugthings/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Plugthing, resource.findone);
};

// Preprocessor for POST /plugthings
exports.create = function(req, res){
  // This is what it looks like when you don't use any access control.
  app.doIfHasAccess(req, res, 'Users', Plug.Plugthing, resource.create);
};

// Preprocessor for PUT /plugthings/:id
exports.update = function(req, res){
  // This if statement is not required but illustrates another way to use access control. Note that any Admin can still gain access to resources that require 'Owner' level access control. Access Levels are: Admins, Users, Owner, Humans, Public
  if (app.HasAccess(req, res, 'Owner')) {
    resource.update(req, res, Plug.Plugthing);
  }
};

// Preprocessor for DELETE /plugthings/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Owner')) {
    resource.remove(req, res, Plug.Plugthing);
  }
};

