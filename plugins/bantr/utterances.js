
// UTTERANCES ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug'),
    Bantr    = require('./bantr');

// Preprocessor for GET /utterances
exports.find = function(req, res){
  // Using app.doIfHasAccess is not required but illustrates the use of access control.
  // There is a good change you will want to enforce 'Admins' level access to plugin resources.
  app.doIfHasAccess(req, res, 'Admins', Plug.Utterance, resource.find);
};

// Preprocessor for GET /utterances/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', Plug.Utterance, resource.findone);
};

// Preprocessor for POST /utterances
exports.create = function(req, res){
  // Override the standard data response on resource create, unless quiet param is set
  var noresponse = true;
  if (req.params['quiet']) {
    noresponse = false;
  }
  resource.create(req, res, Plug.Utterance, function(req, res) {
    // You would think that you should learn before you react, but then the reaction would be slow. May change later.
    Bantr.react(req, res, function(req, res) {
      Bantr.learn(req, res);
    });
  }, noresponse);
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
