
// WATCHLIST ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    Plug     = require('./plug'),
    resource = require('../../routes/resource');

var schema = "{\n\
  user_id        : ObjectId,                          // The owner.\n\
  seriesname     : { type: String, required: true},   // No notes.\n\
  asin           : { type: String, required: true},   // No notes.\n\
  imageurl       : String,                            // No notes.\n\
  pageurl        : String,                            // No notes.\n\
  networkname    : String,                            // The cable or TV network.\n\
  creator_id     : ObjectId,                          // Required by Fluff.\n\
  lastupdater_id : ObjectId,                          // Required by Fluff.\n\
  creation       : { type: Date, default: Date.now }, // Required by Fluff.\n\
  lastupdate     : { type: Date, default: Date.now }  // Required by Fluff.\n\
}";

var display_columns = [{
  name:  'networkname',
  title: 'Network',
  size:  20
},
{
  name:  'seriesname',
  title: 'Series',
  size:  20
},
{
  name:  'imageurl',
  title: 'Image',
  type: 'image',
  size:  20
},
{
  name:  'pageurl',
  title: 'Page',
  size:  20
},
{
  name:  'asin',
  title: 'ID',
  size:  20
}];

var sort_column = { name:'seriesname', order:true };

// These are used in plug.js
exports.matchfields = ['seriesname'];
exports.schema = schema;

// Preprocessor for GET /watchlist
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Watchlist, function (req, res, resourceScope) {
    var filter = {user_id: req.session.user_id};
    resource.find(req, res, resourceScope, filter);
  });
};

// Preprocessor for GET /watchlist/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Watchlist, function(req, res) {
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column
    }
    res.json(data);
  });
};

// Preprocessor for GET /watchlist/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Watchlist, resource.findone);
};

// Preprocessor for POST /watchlist
exports.create = function(req, res){
  app.doIfHasAccess(req, res, 'Users', Plug.Watchlist, function (req, res) {
    var filter = {user_id: req.session.user_id, asin: req.body.asin};
    Plug.Watchlist.findOne(filter, function (err, watchlistItem) {
      if (watchlistItem) {
        app.msgResponse(req, res, 403, 'Series is already in your watchlist.');
      }
      else {
        resource.create(req, res, resource);
      }
    });
  });
};

// Preprocessor for DELETE /watchlist/:id
exports.remove = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.Watchlist, resource.remove);
};
