
// GENERIC RESOURCE HANDLER

var app     = require('../app'),
    schemas = require('../schemas');

// Handler for GET
exports.find = function(req, res, resource, filter, callback){
  // First check if the query has a filter, and if so, use it
  var query_filter = {};
  for (param in req.query) {
    if (schemas.enums.match_field.indexOf(param) >= 0) {
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

// GET /resource/count
exports.count = function(req, res, resource, filter, callback){
  // First check if the query has a filter, and if so, use it
  var query_filter = {};
  for (param in req.query) {
    if (schemas.enums.match_field.indexOf(param) >= 0) {
      query_filter[param] = new RegExp(req.query[param], 'i');
    }
  }
  filter = filter ? filter : query_filter;
  console.log("findfilter: " + JSON.stringify(filter));
  resource.count(filter).exec(function (err, count) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (count >= 0) {
        res.json({count: count});
        if (callback) {
          callback(req, res, count);
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
  req.body.creator_id     = req.session.user_id;
  req.body.lastupdater_id = req.session.user_id;
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
        app.msgResponse(req, res, 404, resource.modelName + ' could not be created.');
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
exports.remove = function(req, res, resource, callback){
  resource.remove({_id: req.params.id}, function (err, data) {
    if (err) { var body = err; }
    else { var body = { msg: "Removed."}; }
    console.log("REMOVE ITEM:\n" + JSON.stringify(data));
    res.json(body);
    if (!err && callback) {
      callback(req, res, data);
    }
  });
};

// Handler for POST /resource/import
exports.import = function(req, res, resource, callback){
  var fs = require('fs');
  var importData = [];
  var delimiter  = req.body.delimiter ? req.body.delimiter : ",";
  var endofrow   = req.body.endofrow  ? req.body.endofrow  : "\n";
  // If there is a file and it's 500MB or less then import it
  if (req.files && req.files.file && (req.files.file.size <= 500000000))  {
    console.log("IMPORTING FILE");
    fs.readFile(req.files.file.path, function (err, data) {
      importData = data.split(endofrow);
      doImport(req, res, resource, importData, delimiter, callback);
    });
  }
  else {
    // Otherwise if there's a url then pull the data from there
    if (req.body.url) {
      console.log("IMPORTING FROM URL: " + req.body.url);
      if (/^https:\/\//i.test(req.body.url)) {
        var request = require('https');
      }
      else {
        var request = require('http');
      }
      var data = "";
      var datarequest = request.get(req.body.url, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          data += chunk;
        });
        response.on('end', function(){
          importData = data.split(endofrow);
          doImport(req, res, resource, importData, delimiter, callback);
        });
      });
    }
    else {
      app.msgResponse(req, res, 404, "No file or url specified.");
    }
  }
};

var doImport = function (req, res, resource, importData, delimiter, callback) {
  var jsonData   = [];
  var fieldSet   = [];
  console.log("Parsing " + importData.length + " items for import...");
  importData.forEach (function (item, i) {
    console.log(item);
    var itemData = item.trim("\r").trim().split(delimiter);
    if (i == 0) {
      if (req.body && req.body.fieldset) {
        req.body.fieldset.split(",").foreEach (function (field, f) {
          fieldSet[f] = field.trim().toLowerCase();
        });
      }
      else {
        itemData.forEach (function (field, f) {
          fieldSet[f] = field.trim().toLowerCase();
        });
      }
    }
    else {
      var itemObj = {};
      itemData.forEach (function (field, f) {
        itemObj[fieldSet[f]]   = field;
        itemObj.creator_id     = req.session.user_id;
        itemObj.lastupdater_id = req.session.user_id;
        if (itemObj._id != undefined)        delete itemObj._id;
        if (itemObj.creation != undefined)   delete itemObj.creation;
        if (itemObj.lastupdate != undefined) delete itemObj.lastupdate;
      })
      console.log(itemObj);
      jsonData.push(itemObj);
    }
  });
  resource.create(jsonData, function (err, data) {
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
        app.msgResponse(req, res, 404, resource.modelName + ' could not be imported.');
      }
    }
    //console.log("CREATE:\n" + body);
  });
}
