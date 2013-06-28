
// GENERIC RESOURCE HANDLER

// Handler for GET
exports.find = function(req, res, resource, filter){
  resource.find(filter).exec(function (err, data) {
    if (err) { var body = err; }
    else { var body = data; }
    //console.log("FIND MANY:\n" + body);
    res.json(body);
  });
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
exports.findone = function(req, res, resource){
  resource.findById(req.params.id).exec(function (err, data) {
    if (err) { var body = err; }
    else { var body = data; }
    //console.log("FIND ONE:\n" + body);
    res.json(body);
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
  if (filter) console.log("FILTER: " + JSON.stringify(filter));
  resource.findOneAndUpdate(filter ? filter : {"_id": req.params.id}, req.body, function (err, data) {
    if (err) { var body = err; }
    else { 
      if (filter && !data) {
        res.status(404);
        var body = {msg: 'Nothing to update.'};
      }
      else {
        var body = data;
      }
    }
    console.log("UPDATE ITEM:\n" + JSON.stringify(data));
    res.json(body);
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
