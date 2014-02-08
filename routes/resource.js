
// GENERIC RESOURCE HANDLER

var app     = require('../app'),
    Fluff   = app.Fluff,
    schemas = require('../schemas');

// Handler for GET
exports.find = function(req, res, resource, filter, callback){
  // First check if the query has a filter, and if so, use it
  var query_filter = {};
  for (param in req.query) {
    if (schemas.enums.match_field.indexOf(param) != -1) {
      query_filter[param] = new RegExp(req.query[param], 'i');
    }
  }
  filter = filter ? filter : query_filter;
  console.log("findfilter: " + JSON.stringify(filter));
  var limit = req.params.limit || 100;
  var sort = '-creation';
  if (req.params.sort) {
    if (req.params.sort.split('-')[1] == 'desc') {
      sort = '-';
    }
    else {
      sort = '+';
    }
    sort += req.params.sort.split('-')[0];
  }
  resource.find(filter).sort(sort).limit(limit).exec(function (err, data) {
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
        var name = resource.modelName;
        for (model in app.Models) {
          if (app.Models[model] == resource) {
            name = model;
          }
        }
        app.msgResponse(req, res, 404, name + ' not found.');
      }
    }
  });
};

// GET /resource/count
exports.count = function(req, res, resource, filter, callback){
  // First check if the query has a filter, and if so, use it
  var query_filter = {};
  for (param in req.query) {
    if (schemas.enums.match_field.indexOf(param) != -1) {
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
        var name = resource.modelName;
        for (model in app.Models) {
          if (app.Models[model] == resource) {
            name = model;
          }
        }
        app.msgResponse(req, res, 404, name + ' not found.');
      }
    }
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
        var name = resource.modelName;
        for (model in app.Models) {
          if (app.Models[model] == resource) {
            name = model;
          }
        }
        app.msgResponse(req, res, 404, name + ' not found.');
      }
    }
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
        var name = resource.modelName;
        for (model in app.Models) {
          if (app.Models[model] == resource) {
            name = model;
          }
        }
        app.msgResponse(req, res, 404, name + ' not found.');
      }
    }
  });
};

// Handler for POST
exports.create = function(req, res, resource, callback, noresponse){
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  var rightNow = new Date;
  req.body.creator_id     = req.session.user_id;
  req.body.lastupdater_id = req.session.user_id;
  req.body.creation       = rightNow;
  req.body.lastupdate     = rightNow;
  // If the resource has a user_id field, then fill it on create
  console.log("INFO " + JSON.stringify(resource.schema.path("user_id")));
  if (resource.schema.path("user_id") && (!req.body.user_id)) {
    req.body.user_id = req.session.user_id;
  }
  console.log("INSERTING: "+ JSON.stringify(req.body));
  resource.create(req.body, function (err, data) {
    if (err) { 
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) { 
        if (!noresponse) {
          res.json(data);
        }
        if (callback) {
          callback(req, res, data);
        }
      }
      else {
        app.msgResponse(req, res, 404, resource.modelName + ' could not be created.');
      }
    }
  });
};

// Handler for PUT with id or other filter
exports.update = function(req, res, resource, filter, callback, noresponse){
  console.log("IN UPDATE");
  if (req.body.id)  { delete req.body.id; }
  if (req.body._id) { delete req.body._id; }
  req.body.lastupdate     = new Date;
  if (req.session.user_id) {
    req.body.lastupdater_id = req.session.user_id;
  }
  filter = filter ? filter : {"_id": req.params.id}
  console.log("FILTER: " + JSON.stringify(filter));
  resource.findOneAndUpdate(filter, req.body, function (err, data) {
    if (err) {
      app.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else { 
      if (data) {
        console.log("UPDATE ITEM:\n" + JSON.stringify(data));
        if (!noresponse) {
          res.json(data);
        }
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
exports.remove = function(req, res, resource, callback, noresponse){
  resource.remove({_id: req.params.id}, function (err, data) {
    if (err) { var body = err; }
    else { var body = { msg: "Removed."}; }
    console.log("REMOVE ITEM:\n" + JSON.stringify(data));
    if (!noresponse) {
      res.json(body);
    }
    if (!err && callback) {
      callback(req, res, data);
    }
  });
};

// Handler for POST /resource/import
exports.import = function(req, res, resource, callback){
  var delimiter  = (req.body && req.body.delimiter && (req.body.delimiter != "")) ? req.body.delimiter : ",";
  // If there is a file and it's 500MB or less then import it
  if (req.files && req.files.file && (req.files.file.size <= 500000000))  {
    console.log("IMPORTING UPLOADED FILE");
    var fs = require('fs');
    fs.readFile(req.files.file.path, function (err, data) {
      if (err) {
        app.msgResponse(req, res, 500, JSON.stringify(err));
      }
      var importData = data.toString();
      importData = CsvToArray(importData, delimiter);
      // If this is called from POST /models, then finish creation
      if (/\/admin\/api\/models/i.test(req.path)) {
        callback(req, res, resource, importData);
      }
      else {
        doImport(req, res, resource, importData, null, callback);
      }
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
          var importData = data;
          importData = CsvToArray(importData, delimiter);
          // If this is called from POST /models, then finish creation
          if (/\/admin\/api\/models/i.test(req.path)) {
            callback(req, res, resource, importData);
          }
          else {
            doImport(req, res, resource, importData, null, callback);
          }
        });
      });
    }
    else {
      app.msgResponse(req, res, 404, "No file or url specified.");
    }
  }
};

var doImport = function (req, res, resource, importData, model, callback) {
  var jsonData   = [];
  var fieldSet   = [];
  console.log("Parsing items for import...");
  importData.forEach (function (item, i) {
    console.log(item);
    if (i == 0) {
      if (req.body && req.body.fieldset && (req.body.fieldset != "")) {
        req.body.fieldset.foreEach (function (field, f) {
          fieldSet[f] = app.dehumanize(field.trim());
        });
      }
      else {
        item.forEach (function (field, f) {
          fieldSet[f] = app.dehumanize(field.trim());
        });
      }
    }
    else {
      var itemObj = {};
      item.forEach (function (field, f) {
        itemObj[fieldSet[f]]   = field;
        itemObj.creator_id     = req.session.user_id;
        itemObj.lastupdater_id = req.session.user_id;
        if (itemObj._id        != undefined) delete itemObj._id;
        if (itemObj.creation   != undefined) delete itemObj.creation;
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
      if (model) {
        res.json(model);
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
    }
  });
}
exports.doImport = doImport;

// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CsvToArray (strData, strDelimiter){
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    (
      // Delimiters.
      "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

      // Quoted fields.
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

      // Standard fields.
      "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ),
    "gi"
    );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec( strData )){

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[ 1 ];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (
      strMatchedDelimiter.length &&
      (strMatchedDelimiter != strDelimiter)
      ){

      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push( [] );

    }

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[ 2 ]){

      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      var strMatchedValue = arrMatches[ 2 ].replace(
        new RegExp( "\"\"", "g" ),
        "\""
        );

    } else {

      // We found a non-quoted value.
      var strMatchedValue = arrMatches[ 3 ];

    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[ arrData.length - 1 ].push( strMatchedValue );
  }

  // Return the parsed data.
  return( arrData );
}

