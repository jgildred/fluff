
// MODEL RESOURCE PREPROCESSOR

var app = require('../app');
var resource = require('./resource');

// Preprocessor for GET /models
exports.find = function (req, res) {
  app.doIfHasAccess(req, res, 'Admins', app.Model, resource.find);
}

// Preprocessor for GET /models/:id
exports.findone = function (req, res) {
  app.doIfHasAccess(req, res, 'Admins', app.Model, resource.findone);
}

// Preprocessor for POST /models
exports.create = function (req, res) {
  app.doIfHasAccess(req, res, 'Admins', app.Model, function (req, res) {
    if (!req.body.name) {
      app.msgResponse(req, res, 400, 'The model must have a name.');
    }
    else {
      // Make sure the new name is not stepping on another one
      if (modelIndexFromName(req.body.name) != null) {
        app.msgResponse(req, res, 400, 'Sorry, there\'s already a model named ' + req.body.name + '.');
      }
      else {
        // Make sure the model_id is lower case
        if (!req.body.model_id) {
          req.body.model_id = app.dehumanize(req.body.name);
        }
        else {
          req.body.model_id = app.dehumanize(req.body.model_id);
        }
        if (app.flattenArray(app.App.get('models'), 'model_id').indexOf(req.body.model_id) != -1) {
          app.msgResponse(req, res, 400, 'The model name is already in use.');
        }
        else {
          // If there is a schema in the request use it
          if (!req.body.schema_data && req.body.fieldset) {
            req.body.schema_data = app.toSchemaData(req.body.fieldset);
          }
          if (req.body.schema_data) {
            app.Models[req.body.name] = app.toModel({
              model_id    : req.body.model_id, 
              schema_data : req.body.schema_data
            });
          }
          // If there is import data, use the first line as the schema
          if (req.body.url || req.files) {
            resource.import(req, res, null, function (req, res, resource, importData) {
              if (!app.Models[req.body.name]) {
                req.body.schema_data = app.toSchemaData(importData[0]);
                app.Models[req.body.name] = app.toModel({
                  model_id    : req.body.model_id, 
                  schema_data : req.body.schema_data
                });
              }
              doCreate(req, res, importData);
            });
          }
          else {
            if (app.Models[req.body.name]) {
              doCreate(req, res);
            }
            else {
              app.msgResponse(req, res, 400, 'The model must have a schema.');
            }
          }
        }
      }
    }
  });
}

var doCreate = function (req, res, importData) {
  if (app.Models[req.body.name]) {
    // Set the display_columns if not provided
    if (!req.body.display_columns) {
      var inflection = require("inflection");
      eval("var obj = " + req.body.schema_data);
      obj = app.lowerCaseObject(obj);
      var display_columns = [];
      for (attribute in obj) {
        display_columns.push({
          name  : attribute,
          title : inflection.humanize(attribute),
          size  : 100
        });
      }
      req.body.display_columns = display_columns;
    }
    resource.create(req, res, app.Model, function (req, res, model) {
      app.loadOneModel(model);
      // Import data if it was included in the POST
      if (importData) {
        resource.doImport(req, res, app.Models[req.body.name], importData, model);
      }
    });
  }
  else {
    app.msgResponse(req, res, 400, 'The model name conflicts or the schema has issues.');
  }
}

// Preprocessor for PUT /models/:id
exports.update = function (req, res) {
  app.doIfHasAccess(req, res, 'Admins', app.Model, function (req, res) {
    var index = modelIndexFromId(req.params.id);
    if (index == null) {
      app.msgResponse(req, res, 404, 'The model ID is invalid.');
    }
    else {
      // Can't allow model_id to change or it may point to an empty or conflicting model
      if (req.body.model_id) {
        app.msgResponse(req, res, 400, 'Sorry, you can\'t change the model id through the API.');
      }
      else {
        if (req.body.name && (app.dehumanize(req.body.name) != app.dehumanize(app.App.get('models')[index].name))) {
          // Make sure the new name is not stepping on another one
          if (modelIndexFromName(req.body.name) != null) {
            app.msgResponse(req, res, 400, 'Sorry, there\'s already a model named ' + req.body.name + '.');
          }
          // Put the mongoose model under the new name
          else {
            app.Models[req.body.name] = app.Models[app.App.get('models')[index].name];
            delete app.Models[app.App.get('models')[index].name];
            app.App.get('models').splice(index, 1);
            checkSchemaAndUpdate(req, res);
          }
        }
        else {
          checkSchemaAndUpdate(req, res);
        }
      }
    }
  });
}

// Preprocessor for DELETE /models/:id
exports.remove = function (req, res) {
  app.doIfHasAccess(req, res, 'Admins', app.Model, function () {
    app.Model.findById(req.params.id).exec(function(err, model) {
      if (!err && model) {
        // Remove from Models, app.App.get('models'), db collection and routes
        var regex = new RegExp("\/" + app.App.get('config').fluff_path + "\/api\/" + app.dehumanize(model.name), "gi");
        app.removeRoutes(regex);
        app.App.get('models').splice([modelIndexFromId(model._id)], 1);
        console.log("collections:");
        console.log(app.mongooseCollection(model));
        if (app.mongooseCollection(model)) {
          app.mongooseCollection(model).drop(function(err) {
            if (err) {
              console.log('Error dropping collection ' + model.model_id);
              console.log(err);
            }
            else {
              console.log('Dropped collection ' + model.model_id);
            }
          });
        }
        else {
          console.log("No need to drop collection " + model.model_id + ".");
        }
        app.Models[model.name] = null;
        delete app.Models[model.name];
        resource.remove(req, res, app.Model);
      }
      else {
        app.msgResponse(req, res, 404, 'The model ID is invalid.');
      }
    });
  });
}

var checkSchemaAndUpdate = function (req, res) {
  app.Model.findById(req.params.id).exec(function(err, model) {
  if (!err && model) {
    // If schema changed then save the model and restart the server
    if (req.body.schema_data && (req.body.schema_data != model.schema_data)) {
      // Test the schema, if ok then go ahead and update the db then restart the server
      if (app.toModel({model_id: model.model_id + '_test_fluff', schema_data: req.body.schema_data})) {
        console.log("New schema seems ok, updating model " + model.name + "...");
        resource.update(req, res, app.Model, null, function (req, res, model) {
          app.loadOneModel(req, res, model);
        });
      }
      else {
        app.msgResponse(req, res, 400, 'The new schema has some issues.');
      }
    }
    else {
      console.log("Updating model " + model.name + "...");
      resource.update(req, res, app.Model, null, function (req, res, model) {
        app.loadOneModel(req, res, model);
      });
    }
  }
  else {
    app.msgResponse(req, res, 404, 'The model ID is not found.');
  }
});
}

// This will return the hash from app.App.get('models') matching _id
var modelIndexFromId = function (id) {
  if (id && app.App.get('models')) {
    var modelIndex = null;
    app.App.get('models').forEach(function (model, index) {
      if (model._id == id.toString()) {
        modelIndex = index;
      }
    });
    if (modelIndex != null) {
      return modelIndex;
    }
    else {
      return null;
    }
  }
  else {
    return null;
  }
}
exports.modelIndexFromId = modelIndexFromId;

// This will return the hash from app.App.get('models') matching name
var modelIndexFromName = function (name) {
  if (name && app.App.get('models')) {
    var modelIndex = null;
    app.App.get('models').forEach(function (model, index) {
      if (model.name == name) {
        modelIndex = index;
      }
    });
    if (modelIndex != null) {
      return modelIndex;
    }
    else {
      return null;
    }
  }
  else {
    return null;
  }
}
exports.modelIndexFromName = modelIndexFromName;
