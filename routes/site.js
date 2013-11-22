
// SITE RESOURCE HANDLER

var app = require('../app');

// Handler for GET
exports.findone = function(req, res, resource, filter, callback){
  resource.findOne().exec(function (err, site) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (site) { 
        res.json(site);
        if (callback) {
          callback(req, res, site);
        }
      }
      else {
        app.msgResponse(req, res, 404, 'No site found.');
      }
    }
  });
};

// Handler for PUT
exports.update = function(req, res, resource, filter, callback){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  req.body.lastupdate     = new Date;
  req.body.lastupdater_id = req.session.user_id;
  resource.findOneAndUpdate(null, req.body, null, function (err, site) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (site) {
        console.log("UPDATE ITEM:\n" + JSON.stringify(site));
        res.json(site);
      }
      else {
        app.msgResponse(req, res, 404, "Nothing to update.");
      }
    }
    if (!err && callback) {
      callback(req, res, site);
    }
  });
};
