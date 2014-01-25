
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

// Preprocessor for GET /response
exports.respond = function(req, res) {
  var obj = Plug.Utterance;
  var rightNow = new Date;
  var utterance = {};
  utterance['text'] = req.params['text'];
  utterance.creator_id = req.session.user_id;
  utterance.lastupdater_id = req.session.user_id;
  utterance.creation = rightNow;
  utterance.lastupdate = rightNow;
  console.log("UTTERANCE: " + JSON.stringify(utterance));
  // If the resource has a user_id field, then fill it on create
  console.log("INFO " + JSON.stringify(obj.schema.path("user_id")));
  if (obj.schema.path("user_id") && (!utterance.user_id)) {
    utterance.user_id = req.session.user_id;
  }
  console.log("INSERTING: " + JSON.stringify(utterance));
  obj.create(utterance, function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) { 
        // You would think that you should learn before you react, but then the reaction would be slow. May change later.
        Bantr.react(req, res, function(req, res) {
          Bantr.learn(req, res);
        });
      }
      else {
        app.msgResponse(req, res, 404, 'Utterance could not be created.');
      }
    }
  });
};

// Preprocessor for POST /utterances
exports.create = function(req, res){
  resource.create(req, res, Plug.Utterance, function(req, res) {
    Bantr.learn(req, res);
  });
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
