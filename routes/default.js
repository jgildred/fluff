
// GENERIC RESOURCE HANDLER

var app = require('../app');

// Handler for GET
exports.find = function(req, res, resource, filter, callback){
  if (app.HasAccess(req, res, 'Admins', resource)) {
    resource.find(filter).exec(function (err, data) {
      if (err) { var body = err; }
      else { var body = data; }
      //console.log("FIND MANY:\n" + body);
      res.json(body);
      if (!err && callback) {
        callback(req, res, data);
      }
    });
  }
};

exports.where = function(req, res, resource, name, array) {
  resource.where(name).in(array).exec(function (err, data) {
    if (err) { var body = err; }
    else { var body = data; }
    //console.log("FIND MANY:\n" + body);
    res.json(body);
  });
}

// Handler for GET with id
exports.findone = function(req, res, resource, filter, callback){
  filter = filter ? filter : {_id: req.params.id};
  resource.findOne(filter).exec(function (err, data) {
    if (err) { var body = err; }
    else { var body = data; }
    //console.log("FIND ONE:\n" + body);
    res.json(body);
    if (!err && callback) {
      callback(req, res, data);
    }
  });
};

// Handler for POST
exports.create = function(req, res, resource, callback){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  console.log("INSERTING: "+ JSON.stringify(req.body));
  resource.create(req.body, function (err, data) {
    if (err) { var body = err; }
    else { var body = data; }
    console.log("CREATE ITEM:\n" + body);
    res.json(body);
    if (!err && callback) {
      callback(req, res, data);
    }
  });
};

// Handler for PUT with id or other filter
exports.update = function(req, res, resource, filter, callback){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  req.body.lastupdate = new Date;
  filter = filter ? filter : {"_id": req.params.id}
  console.log("FILTER: " + JSON.stringify(filter));
  resource.findOneAndUpdate(filter, req.body, function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (filter && !data) {
        app.msgResponse(req, res, 404, "Nothing to update.");
      }
      else {
        console.log("UPDATE ITEM:\n" + JSON.stringify(data));
        res.json(data);
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
