
// GENERIC RESOURCE HANDLER

var app     = require('../app'),
    schemas = require('../schemas');

// Handler for GET
exports.find = function(req, res, resource, filter, callback){
  // First check if the query has a filter, and if so, use it
  var query_filter = {};
  for (param in req.query) {
    if (schemas.enums.match_fields.indexOf(param) >= 0) {
      query_filter[param] = new RegExp(req.query[param], 'i');
    }
  }
  filter = filter ? filter : query_filter;
  console.log("findfilter: " + JSON.stringify(filter));
  resource.find(filter).exec(function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) {
        var dataset = []; 
        if (req.query.fields) {
          data.forEach(function (item) {
            var iteminfo = {_id: item.id};
            req.query.fields.split(',').forEach(function (field) {
              iteminfo[field] = item[field];
            });
            dataset.push(iteminfo);
          });
        }
        else {
          dataset = data;
        }
        res.json(dataset);
        if (callback) {
          callback(req, res, data);
        }
      }
      else {
        app.msgResponse(req, res, 404, resource.modelName + ' not found.');
      }
    }
    //console.log("FIND ONE:\n" + body);
  });
};

exports.where = function(req, res, resource, name, array, callback) {
  resource.where(name).in(array).exec(function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) { 
        res.json(data);
        if (callback) {
          callback(req, res, data);
        }
      }
      else {
        app.msgResponse(req, res, 404, resource.modelName + ' not found.');
      }
    }
    //console.log("FIND ONE:\n" + body);
  });
};

// Handler for GET with id
exports.findone = function(req, res, resource, filter, callback){
  filter = filter ? filter : {_id: req.params.id};
  resource.findOne(filter).exec(function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) { 
        res.json(data);
        if (callback) {
          callback(req, res, data);
        }
      }
      else {
        app.msgResponse(req, res, 404, resource.modelName + ' not found.');
      }
    }
    //console.log("FIND ONE:\n" + body);
  });
};

// Handler for POST
exports.create = function(req, res, resource, callback){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  req.body.creator_id = req.session.user_id;
  console.log("INSERTING: "+ JSON.stringify(req.body));
  resource.create(req.body, function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) { 
        res.json(data);
        if (callback) {
          callback(req, res, data);
        }
      }
      else {
        app.msgResponse(req, res, 404, resource.modelName + ' not found.');
      }
    }
    //console.log("CREATE:\n" + body);
  });
};

// Handler for PUT with id or other filter
exports.update = function(req, res, resource, filter, callback){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  req.body.lastupdate     = new Date;
  req.body.lastupdater_id = req.session.user_id;
  filter = filter ? filter : {"_id": req.params.id}
  console.log("FILTER: " + JSON.stringify(filter));
  resource.findOneAndUpdate(filter, req.body, function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) {
        console.log("UPDATE ITEM:\n" + JSON.stringify(data));
        res.json(data);
      }
      else {
        app.msgResponse(req, res, 404, "Nothing to update.");
      }
    }
    if (!err && callback) {
      callback(req, res, data);
    }
  });
};

// Handler for DELETE with id
exports.remove = function(req, res, resource){
  resource.remove({_id: req.params.id}, function (err) {
    if (err) { var body = err; }
    else { var body = { msg: "Removed."}; }
    console.log("REMOVE ITEM:\n" + body);
    res.json(body);
  });
};
