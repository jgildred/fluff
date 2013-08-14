
// MAIN APP

// Dependencies
var express    = require('express'),
    http       = require('http'),
    mongoose   = require('mongoose'),
    mime       = require('mime'),
    nodemailer = require('nodemailer'),
    config     = require('./config'),
    schemas    = require('./schemas'),
    csrf       = require('./csrf'),
    auth       = require('./routes/auth'),
    users      = require('./routes/users'),
    models     = require('./routes/models'),
    resource   = require('./routes/resource');

// Create the app
var app = express();
exports.App = app;

var handleError = function (err) {
  console.log("Bad things happened: " + err);
}

var lowerCaseObject = function (obj) {
  var key,
      keys = Object.keys(obj);
  var n = keys.length;
  var newobj={};
  while (n--) {
    key = keys[n];
    newobj[key.toLowerCase()] = obj[key];
  }
  return newobj;
}
exports.lowerCaseObject = lowerCaseObject;

// Load the default config
var loadDefaults = function (custom_config) {
  var active_config = (config && config.Info) ? config.Info : {};
  if (custom_config) {
    active_config = custom_config;
  }
  // if on Heroku or AppFog then fix config
  switch (active_config.app_service) {
    case "Heroku":
      if ((active_config.db_service == "MongoLab") && process.env.MONGOLAB_URI) {
        active_config.db_uri = process.env.MONGOLAB_URI;
      }
      active_config.port = process.env.PORT ? process.env.PORT : 3000;
      break;
    case "AppFog":
      if ((active_config.db_service == "MongoDB") && process.env.VCAP_SERVICES) {
        var env   = JSON.parse(process.env.VCAP_SERVICES);
        var obj   = env['mongodb-1.8'][0]['credentials'];
        var cred  = '';
        if (obj.username && obj.password) {
          cred = obj.username + ":" + obj.password + "@";
        }
        var dburi = "mongodb://" + cred + obj.hostname + ":" + obj.port + "/" + obj.db;
        active_config.db_uri = dburi;
      }
      active_config.port = process.env.VMC_APP_PORT ? process.env.VMC_APP_PORT : 3000;
      break;
    default:
      active_config.port = 3000;
  }
  app.set('config', active_config);
}

// Setup globals
var Server = http.createServer(app),
    PortChanged = false, 
    Site, User, View, Page, Var, Model, 
    Models = {},
    ObjectId = mongoose.Schema.Types.ObjectId,
    Buffer   = mongoose.Schema.Types.Buffer,
    Mixed    = mongoose.Schema.Types.Mixed,
    Callback;
exports.Server = Server;
exports.Models = Models;

// Setup DB connection
var connectDb = function (req, res, callback) {
  console.log("Connecting to " + app.get('config').db_uri);
  mongoose.connect(app.get('config').db_uri);

  // Create schemas and use them to register the models
  var userSchema    = new mongoose.Schema(schemas.user);
  userSchema.virtual('displayname').get(function () {
    return this.firstname ? 
      (this.lastname ? 
        this.firstname + ' ' + this.lastname
        : this.firstname)
      : (this.lastname ?
        this.lastname
        : this.email);
  });
  userSchema.virtual('shortname').get(function () {
    return this.firstname ? 
      this.firstname 
      : (this.lastname ?
        this.lastname
        : this.email);
  });
  userSchema.methods.pwMatch = function (password) {
    var crypto = require('crypto');
    var hash   = crypto.createHash('md5').update(password + this.salt).digest("hex");
    //console.log("PW: " + password);
    //console.log("SALT: " + this.salt);
    //console.log("CHECKING: HASH " + hash + " WITH PWHASH " + this.pwhash);
    return (this.pwhash == hash) ?
      true : false;
  }
  User   = mongoose.model('User', userSchema);
  exports.User = User;

  var siteSchema = new mongoose.Schema(schemas.site);
  Site           = mongoose.model('Site', siteSchema);
  exports.Site = Site;

  var viewSchema = new mongoose.Schema(schemas.view);
  View           = mongoose.model('View', viewSchema);

  var pageSchema = new mongoose.Schema(schemas.page);
  Page           = mongoose.model('Page', pageSchema);

  var varSchema  = new mongoose.Schema(schemas.var);
  Var            = mongoose.model('Var', varSchema);

  var modelSchema  = new mongoose.Schema(schemas.model);
  Model            = mongoose.model('Model', modelSchema);
  exports.Model = Model;

  if (callback) {
    callback(req, res);
  }
}

// Useful for direct manipulation of DB collections
var mongooseCollection = function (model) {
  return mongoose.connection.collections[model.model_id.toLowerCase()];
}
exports.mongooseCollection = mongooseCollection;

// Create a model; model must have a model_id and schema_data
var toModel = function (model, callback) {
  eval("var obj = " + model.schema_data);
  obj = lowerCaseObject(obj);
  // Make sure that the model will handle these fields correctly.
  obj.creator_id     = ObjectId;
  obj.lastupdater_id = ObjectId;
  obj.creation       = { type: Date, default: Date.now };
  obj.lastupdate     = { type: Date, default: Date.now };
  //console.log("Schema data is: " + model.schema_data);
  var schema = new mongoose.Schema(obj);
  var newModel = mongoose.model(users.randomString(), schema, model.model_id.toLowerCase());
  return newModel
}
exports.toModel = toModel;

// CORS setup
var allowCrossDomain = function(req, res, next) {
  if ((!app.get('config').cors.restricted) || (app.get('config').cors.whitelist.indexOf(req.headers.origin) != -1)) { 
    res.header('Access-Control-Allow-Credentials', true); 
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS'); 
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'); 
    
    // intercept OPTIONS method
    if (req.method == 'OPTIONS') {
      res.send(200);
    }
    else {
      next();
    }
  } 
  else {
    console.log("DENIED ORIGIN: " + req.headers.origin);
    res.json({auth: false, origin: req.headers.origin});
  }
}

var doIfHasAccess = function (req, res, level, resourceScope, callback) {
  if (level == "Public") {
    callback(req, res, resourceScope);
  }
  else {
    if (HasAccess(req, res, level, resourceScope)) {
      // Special case for update site
      if ((callback == resource.update) && (resourceScope == Site)) {
        callback(req, res, resourceScope, null, reloadConfig);
      }
      else {
        callback(req, res, resourceScope);
      }
    }
  }
}
exports.doIfHasAccess = doIfHasAccess;

var HasAccess = function(req, res, level, resourceScope){
  console.log("The requested resource is: " + (resourceScope ? resourceScope.modelName : 'none'));
  if (req.session.auth && (req.session.status == 'Active')) {
    switch (level) {
    case 'Users':
      console.log("Restricted to users only.");
      if (resourceScope && (resourceScope.modelName != "User")) {
        return true;
      }
      else {
        if ((req.params && (req.session.user_id == req.params.id))
          || ((req.session.role) && (req.session.role == 'Admin')))
        {        
          return true;
        }
        else {
          msgResponse(req, res, 403, "You must be the correct user or admin.");
          return false;
        }
      }
      break;
    case 'Admins':
      console.log("Restricted to admins only.");
      if ((req.session.role) && (req.session.role == 'Admin')) {
        return true;
      }
      else {
        msgResponse(req, res, 403, "You must be admin.");
        return false;
      }
      break;
    default:
      console.log("Access level is not working: " + level);
      return false;
    }
  }
  else {
    msgResponse(req, res, 403, "You must be logged in.");
    return false;
  }
};
exports.HasAccess = HasAccess;

// Render site info in a page's content
var renderSiteInfo = function (res, template) {
  var site_tag = "site"; // this may move to a site config
  var output = template;
  var siteInfo = [
    { tag: 'name',       value: app.get('config').name },
    { tag: 'url',        value: (app.get('config').ssl ? 'https://' : 'http://') + app.get('config').domain + ((!app.get('config').ssl && (app.get('config').port != 80)) ? app.get('config').port : '') },
    { tag: 'domain',     value: app.get('config').domain },
    { tag: 'protocol',   value: (app.get('config').ssl ? 'https://' : 'http://') },
    { tag: 'fluff_path', value: app.get('config').fluff_path }
  ];
  siteInfo.forEach(function (infoItem) {
    var pattern = new RegExp("{{\\s*" + site_tag + "\\." + infoItem.tag + "\\s*}}", "gi");
    output = output.replace(pattern, infoItem.value);
  });
  res.send(output);
}

// Render vars in a page's content
var renderVars = function (res, template) {
  var var_tag = "var"; // this may move to a site config
  var output = template;
  Var.find().exec(function (err, vars) {
    if (!err && vars) {
      vars.forEach(function (vari) {
        var pattern = new RegExp("{{\\s*" + var_tag + "\\." + vari.name + "\\s*}}", "gi");
        output = output.replace(pattern, vari.value);
      });
    }
    renderSiteInfo(res, output);
  });
}

// Render the view with the page
var renderView = function (res, page) {
  var output = '';
  View.findById(page.view_id).exec(function (err, data) {
    if (!err && data) {
      res.header('Content-Type', data.content_type ? data.content_type : 'text/html');
      var content_tag = "content"; // this may move to a site config
      output = data.template;
      var pattern = new RegExp("{{\\s*" + content_tag + "\\s*}}", "i");
      output = output.replace(pattern, page.content);
    }
    renderVars(res, output);
  });
}

// Setup cms route based upon page in db with matching path
var cmsPages = function (req, res, next) {
  var url = req.originalUrl;
  if (url != "/favicon.ico") {
    console.log("Looking up pages...");
    Page.findOne({"path": url}).exec(function (err, data) {
      if (!err && data) { 
        console.log("Matched a page path.");
        if (data.get('status') == "Published") {
          if (data.get('access') == "Public") {
            renderView(res, data);
          }
          else {
            console.log("Access requested by " + data.get('access'));
            if (HasAccess(req, res, data.get('access'), Page)) {
              renderView(res, data);
            }
            else {
              next();
            }
          }
        }
        else {
          console.log("The requested page is unpublished.");
          res.status = 404;
          res.send("The page you requested does not exist.");
        }
      }
      else {
        //res.status = 404;
        //res.send("The page you requested does not exist.");
        next();
      }
    });
  }
  else {
    console.log("Favicon requested.");
    next();
  }
}

var initDb = function (req, res, callback) {
  console.log("Initialize DB...");
  var crypto = require('crypto')
    , seed   = require('./seed');
  // make sure that there is not existing db data (check for site)
  Site.count().exec(function (err, count) {
    if (!err && (count == 0)) { 

      console.log("No site in the DB yet.");
      Site.create(seed.Data.sites, function (err) {
        console.log("Creating a site...");
        if (err) return handleError(err);

        var firstuser = seed.Data.users[0];
        seed.Data.users.forEach(function (user) { 
          user.salt           = users.randomString();
          user.pwhash         = users.saltyHash(user.password, user.salt);
          user.verifytoken    = users.makeToken();
          user.creator_id     = firstuser._id;
          user.lastupdater_id = firstuser._id;
        });
        User.create(seed.Data.users, function (err) {
          console.log("Creating an admin user...");
          if (err) return handleError(err);

          seed.Data.views.forEach(function (view) {
            view.creator_id     = firstuser._id;
            view.lastupdater_id = firstuser._id;
          });
          View.create(seed.Data.views, function (err, view) {
            console.log("Creating views...");
            if (err) return handleError(err);
            
            seed.Data.pages.forEach(function (page) {
              page.view_id        = view._id;
              page.creator_id     = firstuser._id;
              page.lastupdater_id = firstuser._id;
            });
            Page.create(seed.Data.pages, function (err) {
              console.log("Creating pages...");
              if (err) return handleError(err);
              
              seed.Data.vars.forEach(function (vari) {
                vari.creator_id     = firstuser._id;
                vari.lastupdater_id = firstuser._id;
              });
              Var.create(seed.Data.vars, function (err) {
                console.log("Creating vars...");
                if (err) return handleError(err);

                seed.Data.models.forEach(function (model) {
                  model.creator_id     = firstuser._id;
                  model.lastupdater_id = firstuser._id;
                });
                Model.create(seed.Data.models, function (err) {
                  console.log("Creating a model...");
                  if (err) return handleError(err);

                  console.log("Initialized DB with seed data.");
                  if (callback) {
                    callback(req, res);
                  }
                  else {
                    loadConfig(req, res);
                  }
                });
              });
            });
          });
        });
      });
    }
    else {
      if (count > 0) {
        console.log("There is a Fluff site in the DB already.");
      }
      else {
        console.log("DB init error: " + err);
      }
      console.log("Wipe DB and restart Fluff, or set 'initialize' to false in config.js.");
      runAlertMode("Not feeling fluffy.<br/>Fluff DB already initialized.", callback);
    }
  });
}

var mergeConfig = function (app_config, site_config) {
  console.log("App config: "  + JSON.stringify(app_config));
  console.log("Site config: " + JSON.stringify(site_config));
  for (item in site_config) {
    if ((Object.prototype.toString.call(site_config[item]) === '[object Object]') && (Object.keys(site_config[item]).length > 0)) {
      if (!app_config.hasOwnProperty(item)){
        app_config[item] = {};
      }
      for (sub_item in site_config[item]) {
        app_config[item][sub_item] = site_config[item][sub_item];
      }
    }
    else {
      // don't merge in the port unless custom app_service
      if (item == 'port') {
        if (app_config.app_service == "Custom") {
          app_config[item] = site_config[item];
        }
      }
      else {
        app_config[item] = site_config[item];
      }
    }
  }
  return app_config;
}

// Load the site config from the db
var loadConfig = function (req, res, callback) {
  console.log("Loading config...");
  Site.findOne().exec(function (err, data) {
    if (!err && data) {
      var active_config = app.get('config');
      var stored_config = data.toJSON();
      app.set('config', mergeConfig(active_config, stored_config));
      console.log("Loaded complete config: " + JSON.stringify(app.get('config')));
      if (callback) {
        callback(req, res);
      }
      else {
        applyConfig(req, res);
      }
    }
    else {
      if (!data) {
        console.log("No site found in the DB.");
      }
      else {
        console.log("DB load error: " + err);
      }
      console.log("Point to another DB and restart Fluff, or set 'initialize' to true in config.js.");
      runAlertMode("Not feeling fluffy.<br/>Fluff DB is not initialized.", callback);
    }
  });
}

// Create the mailer
var setupMailer = function () {
  var mailerData = {
    auth: {
      user: app.get('config').smtp.username,
      pass: app.get('config').smtp.password
    }
  };
  if (app.get('config').smtp.service == "Other SMTP") {
    mailerData.host             = app.get('config').smtp.host; // hostname
    mailerData.secureConnection = app.get('config').smtp.ssl;  // use SSL
    mailerData.port             = app.get('config').smtp.port;
  }
  else {
    mailerData.service = app.get('config').smtp.service;
  }
  exports.mailer = nodemailer.createTransport("SMTP", mailerData);
}

var requireApiKey = function(req, res, next) {
  console.log("**** NEW REQUEST *****");
  if (/\/api\//i.test(req.path) && app.get('config').apikey.required) {
    var apikeys = app.get('config').apikey.keychain;
    console.log("API keys are " + app.get('config').apikey.keychain);
    console.log("client API key is " + (req.query ? req.query.apikey : 'missing'));
    if (Object.prototype.toString.call(apikeys) === '[object Array]') {
      var ok = false;
      apikeys.forEach(function(apikey) { 
        if (req.query && req.query.apikey && (req.query.apikey == apikey)) {
          ok = true;
        }
      });
      if (ok) {
        console.log("API key OK.");
        next();
      }
      else {
        console.log("API key is bad.");
        msgResponse(req, res, 403, "API key is missing or invalid from array.");
      }
    }
    else {
      if (req.query && req.query.apikey && (req.query.apikey == apikeys)) {
        console.log("API key OK.");
        next();
      }
      else {
        console.log("API key is bad.");
        msgResponse(req, res, 403, "API key is missing or invalid from string.");
      }
    }
  }
  else {
    console.log("API key not required.");
    next();
  }
}

var defaultAlertPage = function(message) {
  var html  = "<html>\n";
      html += "<head>\n";
      html += "<title>Fluff Alert</title>\n";
      html += "<style>\n";
      html += "body {\n";
      html += "  padding-top:100px;\n";
      html += "}\n";
      html += "p {\n";
      html += "  font-size:18pt;\n";
      html += "  font-family:helvetica,arial;\n";
      html += "  color:#606060;\n";
      html += "  text-align:center;\n";
      html += "  margin-top:20px;\n";
      html += "}\n";
      html += "</style>\n";
      html += "</head>\n";
      html += "<body>\n";
      html += "<p><img src='/images/sad-fluffy.png' /></p>\n";
      html += "<p>" + message + "</p>\n";
      html += "</body>\n";
      html += "</html>";
      return html;
}

var runAlertMode = function(text, callback) {
  app.use ('/public', express.static(__dirname + '/public'));
  app.all ('*', function(req, res) {
    res.status=500; 
    res.send(defaultAlertPage(text));
  });
  startListening(false, callback);
}

var handleModelRequest = function (req, res, next, callback) {
  if (app.get('models')) {
    var match = false;
    app.get('models').forEach(function (model) {
      console.log("Comparing: " + model.name.toLowerCase() + " to " + req.params.model.toLowerCase());
      if (callback && (model.name.toLowerCase() == req.params.model.toLowerCase())) {
        switch (callback) {
          case resource.find:
            var access = model.access.view;
            break;
          case resource.findone:
            var access = model.access.view;
            break;
          case resource.create:
            var access = model.access.create;
            break;
          case resource.update:
            var access = model.access.update;
            break;
          case resource.remove:
            var access = model.access.remove;
            break;
          default:
            var access = "Admins";
        }
        match = true;
        console.log("Processing request for " + model.name);
        doIfHasAccess(req, res, access, Models[model.name], callback);
      }
    });
    if (!match) {
      next();
    }
  }
}

var modelRoutes = function () {
  console.log("Adding routes for models...");
  var base = app.get('config').fluff_path + '/api';
  app.get   (base + '/:model',         function(req, res, next) {
    handleModelRequest(req, res, next, resource.find);
  });
  app.get   (base + '/:model/count', function(req, res, next) {
    handleModelRequest(req, res, next, resource.count);
  });
  app.get   (base + '/:model/:id',     function(req, res, next) {
    handleModelRequest(req, res, next, resource.findone);
  });
  app.post  (base + '/:model',         function(req, res, next) {
    handleModelRequest(req, res, next, resource.create);
  });
  app.put   (base + '/:model/:id',     function(req, res, next) {
    handleModelRequest(req, res, next, resource.update);
  });
  app.patch (base + '/:model/:id',     function(req, res, next) {
    handleModelRequest(req, res, next, resource.update);
  });
  app.del   (base + '/:model/:id',     function(req, res, next) {
    handleModelRequest(req, res, next, resource.remove);
  });
}

// model must have a name, model_id and schema_data
var loadOneModel = function (model) {
  if (Models[model.name]) {
    // Add model name and access to app data for route management
    var loadedModels = app.get('models') ? app.get('models') : [];
    var index  = models.modelIndexFromId(model._id);
    var data   = {
      _id: model._id,
      name: model.name,
      model_id: model.model_id,
      access:{
        view:   model.access.view   ? model.access.view   : 'Public',
        create: model.access.create ? model.access.create : 'Users',
        update: model.access.update ? model.access.update : 'Users',
        remove: model.access.remove ? model.access.remove : 'Users'
      }
    };
    if ((loadedModels.length == 0) || (index == null)) {
      loadedModels.push(data);
    }
    else {
      loadedModels[index] = data;
    }
    app.set('models', loadedModels);
    console.log("Loaded model: " + model.name);
  }
  else {
    console.log("The model " + model.name + " could not be loaded.");
  }
}
exports.loadOneModel = loadOneModel;

var loadModels = function (req, res, callback) {
  console.log("Loading models from DB...");
  Model.find().exec(function (err, models) {
    models.forEach(function (model) {
      Models[model.name] = toModel(model);
      loadOneModel(model);
    });
    if (callback) {
      callback(req, res);
    }
  });
}

var adminRoutes = function () {
  // Setup routes using the default resource handler
  var base = app.get('config').fluff_path + '/admin/api';

  // Authentication routes
  app.get (base + '/auth',     auth.check);
  app.get (base + '/auth/:id', auth.check);
  app.post(base + '/auth',     auth.attach);
  app.put (base + '/auth/:id', auth.attach);
  app.del (base + '/auth/:id', auth.detach);

  // User routes
  app.get (base + '/users',           users.find);
  app.get (base + '/users/:id',       users.findone);
  app.post(base + '/users',           users.create);
  app.put (base + '/users/:id',       users.update);
  app.put (base + '/verify/:token',   users.verify);
  app.put (base + '/pwreset/:email',  users.pwreset);
  app.put (base + '/pwchange/:token', users.pwchange);
  app.del (base + '/users/:id',       users.remove);

  // Page routes
  app.get (base + '/pages',     function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.find);} );
  app.get (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.findone);} );
  app.post(base + '/pages',     function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.create);} );
  app.put (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.update);} );
  app.del (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.remove);} );

  // View routes
  app.get (base + '/views',     function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.find);} );
  app.get (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.findone);} );
  app.post(base + '/views',     function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.create);} );
  app.put (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.update);} );
  app.del (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, removeIfNotLast);} );

  // Var routes
  app.get (base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.find);} );
  app.get (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.findone);} );
  app.post(base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.create);} );
  app.put (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.update);} );
  app.del (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.remove);} );

  // Model routes
  app.get  (base + '/models',     models.find);
  app.get  (base + '/models/:id', models.findone);
  app.post (base + '/models',     models.create);
  app.put  (base + '/models/:id', models.update);
  app.patch(base + '/models/:id', models.update);
  app.del  (base + '/models/:id', models.remove);

  // Site routes (only one site can and must exist)
  app.get (base + '/sites',     function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.find);} );
  app.get (base + '/sites/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.findone);} );
  app.put (base + '/sites/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.update);} );
}

var staticType = function (req, res, next) {
  mime.default_type = "text/html";
  var type = mime.lookup(req.path);
  var charset = mime.charsets.lookup(type);
  console.log("MIME type is " + type);
  res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
  next();
}

var staticFiles = function () {
  app.use(app.get('config').fluff_path, staticType);
  app.use(app.get('config').fluff_path + '/images',  
    express.static(__dirname + '/public/images'));
  app.use(app.get('config').fluff_path + '/css', 
    express.static(__dirname + '/public/css'));
  app.use(app.get('config').fluff_path + '/js', 
    express.static(__dirname + '/public/js'));
  app.use(app.get('config').fluff_path + '/fonts', 
    express.static(__dirname + '/public/fonts'));
  app.use(app.get('config').fluff_path + '/files', 
    express.static(__dirname + '/public/files'));
  app.use(app.get('config').fluff_path + '/admin', 
    express.static(__dirname + '/admin'));
}

// Every time the site config changes this is run. Could be more efficient.
var applyConfig = function (req, res, callback) {
  // Site url is useful for email notifications which link back to the site
  var protocol  = app.get('config').ssl  ? "https://" : "http://";
  var port      = app.get('config').port ? ":" + app.get('config').port : "";
  var siteUrl   = protocol + app.get('config').domain;
  // Heroku and other paas will not expose the internal server port
  if (app.get('config').app_service != "Custom") {
    siteUrl += port;
  }
  exports.siteUrl = siteUrl;   // Used by some routes

  // Run all the setup routines with the latest config
  setupMailer();               // Uses app.config smtp
  app.use(allowCrossDomain);   // Uses app.config cors
  app.use(requireApiKey);      // Uses app.config api_key
  app.use(csrf.check);         // Uses app.config fluff_path
  adminRoutes();       // Uses app.config fluff_path
  modelRoutes();       // Uses app.config fluff_path
  notFoundRoute();     // Uses app.config fluff_path
  app.use(app.router); // Routes are processed before cmsPages
  app.use(cmsPages);   // Doesn't use app.config, but runs on every request
  staticFiles();       // Static files are processed last
  // Restart the server if the port is changed
  if (Server.address()) {
    console.log("port is " + Server.address().port);
    if (Server.address().port != app.get('config').port) {
      var time = new Date();
      console.log("Closing server at " + time + " and waiting for connections to time out...");
      Server.close(function (req, res, callback) {
        console.log("Starting back up at " + time + " and reloading config from DB...");
        startListening(true, callback);
      });
    }
  }
  else {
    startListening(true, callback);
  }
}

var removeRoutes = function (regex) {
  for (method in app.routes) {
    for (var r = 0; r < app.routes[method].length; r++) {
      var route = app.routes[method][r];
      if (route.path.match(regex)) {
        console.log("Removing route: " + route.path);
        app.routes[method].splice(r, 1);
        r--;
      }
    }
  }
}
exports.removeRoutes = removeRoutes;

var notFoundRoute = function () {
  var base = app.get('config').fluff_path;
  var msg = "The requested resource does not exist.";
  app.all (base + '/api/*', function(req, res) {
    res.status=404;
    res.json({msg: msg});
  });
  app.all (base + '/admin/api/*', function(req, res) {
    res.status=404;
    res.json({msg: msg});
  });
}

// make sure it's not the last item in cases where at least one is required
var removeIfNotLast = function (req, res, resourceScope) {
  var msg = "Sorry, you can't remove the last " + resourceScope.modelName + ".";
  resourceScope.count().exec(function (err, count) {
    if (!err && (count > 1)) { 
      console.log("More than one " + resourceScope.modelName + " left.");
      resourceScope.remove({_id: req.params.id}, function (err) {
        if (err) { msg = err; }
        else { msg = { msg: resourceScope.modelName + " removed."}; }
        msgResponse(req, res, null, msg);
      });
    }
    else {
      msgResponse(req, res, 403, msg);
    }
  });
}

var startup = function (req, res) {
  console.log("Starting Fluff...");
  if (app.get('config').initialize) {
    
    // Initialize db with seed data (site, admin, example page, view and vars)
    connectDb(req, res, function (req, res) {
      initDb(req, res, function (req, res) {
        loadConfig (req, res, function (req, res) {
          loadModels (req, res, function (req, res) {
            applyConfig(req, res, Callback);
          });
        });
      });
    });
  }
  else {
    connectDb(req, res, function (req, res) {
      loadConfig (req, res, function (req, res) {
        loadModels (req, res, function (req, res) {
          applyConfig(req, res, Callback);
        });
      });
    });
  }
}

var reloadConfig = function (req, res) {
  loadConfig(req, res, applyConfig);
}

var msgResponse = function (req, res, status, msg) {
  console.log(msg);
  res.status(status || 200);
  res.json({msg: msg});
}
exports.msgResponse = msgResponse;

// JSON body, sessions and other setup
var preLaunch = function () {
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret : "abracadabra",
    maxAge : new Date(Date.now() + 3600000) // 1 Hour; should move to per user setting
  }));
  app.use(express.methodOverride());
}

// Start listening
var startListening = function (ok, callback) {
  var time = new Date();
  Server.listen(app.get('config').port);
  console.log("Started listening on port " + app.get('config').port + " at " + time + ".");
  if (ok && app.get('config').fluff_path) {
    console.log("Admin is located at " + app.get('config').fluff_path + "/admin.");
    console.log("Public files are located at " + app.get('config').fluff_path + "/js,css,images,fonts,files.");
    console.log("Fluff is up.");
  }
  else {
    console.log("Fluff is in alert mode.");
  }
  if (callback) {
    console.log("Post launch callback starting...");
    callback();
  }
  else {
    console.log("No post launch callback.");
  }
}

// This is the red button
var launch = function (config, callback) {
  // This callback is global as it is run at the end of startup
  Callback = callback;
  preLaunch();
  loadDefaults(config);
  startup();
}
exports.launch = launch;
