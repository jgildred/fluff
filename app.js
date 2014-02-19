
// MAIN APP

// Dependencies
var express    = require('express'),
    http       = require('http'),
    mongoose   = require('mongoose');

// Setup globals
var Fluff  = {},
    app    = express(),
    Server = http.createServer(app),
    PortChanged = false, 
    Site, User, View, Page, Var, Model, 
    Models   = {},
    Plugins  = {},
    ObjectId = mongoose.Schema.Types.ObjectId,
    Buffer   = mongoose.Schema.Types.Buffer,
    Mixed    = mongoose.Schema.Types.Mixed,
    Callback;
    Fluff.matchfield = {};
    Fluff.reCaptchaPublicKey  = '';
    Fluff.reCaptchaPrivateKey = '';
exports.Fluff  = Fluff;
Fluff.app      = app;
exports.App    = app;
exports.Server = Server;
exports.Models = Models;

// Remaining dependencies
var mime       = require('mime'),
    nodemailer = require('nodemailer'),
    fs         = require('fs');
    config     = require('./config'),
    schemas    = require('./schemas'),
    csrf       = require('./csrf'),
    site       = require('./routes/site'),
    auth       = require('./routes/auth'),
    users      = require('./routes/users'),
    models     = require('./routes/models'),
    resource   = require('./routes/resource');

// Helper functions
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
    newobj[dehumanize(key)] = obj[key];
  }
  return newobj;
}
exports.lowerCaseObject = lowerCaseObject;

var flattenArray = function (objectArray, key) {
  var array = [];
  if (objectArray) {
    objectArray.forEach(function (object) {
      array.push(object[key]);
    });
  }
  return array;
}
exports.flattenArray = flattenArray;

var dehumanize = function (string) {
  return string.replace(" ", "_").toLowerCase();
}
exports.dehumanize = dehumanize;

// Init all plugins; they are initialized synchronously in directory order
var initPlugins = function (req, res, callback) {
  var path = __dirname + '/plugins';
  fs.exists(path, function (exists) {
    if (exists) {
      fs.readdir(path, function (err, subDirectories) {
        if (subDirectories.length > 0) {
          var plugins = [];
          subDirectories.forEach(function (name) {
            if (name.substr(0, 1) != ".") {
              plugins.push(name);
            }
          });
          console.log("Detected plugins: " + plugins.join(", "));
          initOnePlugin(req, res, plugins, 0, callback);
        }
        else {
          console.log("No plugins detected.");
          if (callback) {
            callback(req, res);
          }
        }
      });
    }
    else {
      if (callback) {
        callback(req, res);
      }
    }
  });
}

// Init one plugin; you need the directory list and index of the plugin in the list
var initOnePlugin = function (req, res, dirs, index, callback) {
  var path = __dirname + '/plugins';
  index = index ? index : 0;
  var name = dirs[index];
  // Skip directories that do not contain plug.js
  fs.exists(path + '/' + name + '/plug.js', function (exists) {
    if (exists) {
      if (Plugins[name]) {
        console.log("Could not initialize " + name + " plugin as another already exists with the same name.");
        finishInitPlugin(req, res, dirs, index, callback);
      }
      else {
        Plugins[name] = require('./plugins/' + name + '/plug');
        Plugins[name].init(function () {
          console.log("Initialized " + name + " plugin.");
          finishInitPlugin(req, res, dirs, index, callback);
        });
      }
    }
    else {
      console.log("Could not find plug.js in the /plugins/" + name + " directory.");
      finishInitPlugin(req, res, dirs, index, callback);
    }
  });
}

// Run after each plugin is initialized
var finishInitPlugin = function (req, res, dirs, index, callback) {
  // If there are more plugins to init, do the next
  if ((index != null) && (dirs.length > (index + 1))) {
    // Check that the plugin has not already been initialized
    var pluginArray = [];
    for (var p in Plugins) {
      if (Plugins.hasOwnProperty(p)) {
        pluginArray.push(p);
      }
    }
    if (pluginArray.indexOf(dirs[index + 1]) == -1) {
      initOnePlugin(req, res, dirs, index + 1, callback);
    }
  }
  else {
    if (callback) {
      callback(req, res);
    }
  }
}

// Load all plugins
var loadPlugins = function (callback, callbackEach) {
  for (plugin in Plugins) {
    if (callbackEach) {
      loadOnePlugin(plugin, callbackEach);
    }
    else {
      loadOnePlugin(plugin);
    }
  }
  if (callback) {
    callback();
  }
}

// Load one plugin
var loadOnePlugin = function (name, callback) {
  if (Plugins[name]) {
    Plugins[name].load(function () {
      console.log("Loaded " + name + " plugin.");
      if (callback) {
        callback();
      }
    });
  }
  else {
    console.log("Could not load " + name + " plugin as it was not initialized.");
    if (callback) {
      callback();
    }
  }
}

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
    console.log('password: ' + password);
    console.log('client hash:' + hash);
    console.log('db hash: ' + this.pwhash);
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

  Fluff.matchfield.general = schemas.enums.match_field;

  if (callback) {
    callback(req, res);
  }
}

// Useful for direct manipulation of DB collections
var mongooseCollection = function (model) {
  return mongoose.connection.collections[dehumanize(model.model_id)];
}
exports.mongooseCollection = mongooseCollection;

// Create a schema from schema_data
var toSchema = function (schema_data) {
  eval("var obj = " + schema_data);
  obj = lowerCaseObject(obj);
  // Make sure that the model will handle these fields correctly.
  obj.creator_id     = ObjectId;
  obj.lastupdater_id = ObjectId;
  obj.creation       = { type: Date, default: Date.now };
  obj.lastupdate     = { type: Date, default: Date.now };
  var schema = new mongoose.Schema(obj);
  return schema;
}
exports.toSchema = toSchema;

// Create a model; model must have a model_id and schema_data
var toModel = function (model) {
  var schema = toSchema(model.schema_data);
  var newModel = mongoose.model(dehumanize(model.model_id) + "-" + randomString(), schema, dehumanize(model.model_id));
  return newModel;
}
exports.toModel = toModel;

// Force SSL if required
var forceSsl = function (req, res, next) {
  if (app.get('config').ssl) { 
      if (req.headers['x-forwarded-proto'] != 'https') {
        var url = 'https://' + req.host + req.url;
        res.redirect(url);
      }
      else {
        next();
      }
  }
  else {
    next();
  }
}

// CORS setup
var allowCrossDomain = function (req, res, next) {
  console.log("REQ " + req.method + ": " + req.path + " from " + req.ip);
  console.log("REQ BODY: " + JSON.stringify(req.body));
  console.log("REQ HEADERS: " + JSON.stringify(req.headers));
  // intercept OPTIONS method

  if (app.get('config').cors.restricted) { 
    // Allow access only to whitelist and self
    if ((app.get('config').cors.whitelist.indexOf(req.headers.origin) == -1) && (app.get('config').cors.whitelist.indexOf("http://" + req.headers.host) == -1) && (app.get('config').cors.whitelist.indexOf("https://" + req.headers.host == -1))) {
      console.log("DENIED ORIGIN: '" + (req.headers.origin || req.headers.host) + "'");
      res.json({auth: false, origin: (req.headers.origin || req.headers.host)});
    }
    else {
      // Build the cors header
      var origin = req.headers.origin ? req.headers.origin : "http://" + req.headers.host;
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS'); 
      res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key, Cookie'); 
      if (req.method == 'OPTIONS') {
        res.send(200);
      }
      else {
        next();
      }
    }
  } 
  // Allow anything
  else {
    // Build the cors header
    var origin = req.headers.origin ? req.headers.origin : "http://" + req.headers.host;
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS'); 
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key, Cookie'); 
    if (req.method == 'OPTIONS') {
      res.send(200);
    }
    else {
      next();
    }
  }
}

var doIfHasAccess = function (req, res, level, resourceScope, callback) {
  if (level == "Public") {
    callback(req, res, resourceScope);
  }
  else {
    if (level == "Humans") {
      if (req.session.human) {
        callback(req, res, resourceScope);
      }
      else {
        msgResponse(req, res, 404, "Sorry, humans only.");
      }
    }
    else {
      if (HasAccess(req, res, level, resourceScope)) {
        // if restricted to owner then positive result still needs to match user_id or be admin
        if ((level == "Owner") && req.params.id) {
          if ((req.session.role) && (req.session.role == 'Admin')) {
            console.log(data.user_id + " has access to the requested item.");
            callback(req, res, resourceScope);
          }
          else {
            resourceScope.findOne({_id: req.params.id}).exec(function (err, data) {
              if (data && (req.session.user_id == data.user_id)) {
                console.log(data.user_id + " has access to the requested item.");
                callback(req, res, resourceScope);
              }
              else {
                msgResponse(req, res, 404, "You must be the owner.");
              }
            });
          }
        }
        else {
          // Special case for update site and model which require reload config
          if (([resource.create, resource.update, resource.remove].indexOf(callback) != -1) && ([Site, Model].indexOf(resourceScope) != -1)) { 
            callback(req, res, resourceScope, null, reloadConfig);
          }
          else {
            callback(req, res, resourceScope);
          }
        }
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
    case 'Owner':
      console.log("Restricted to owner only.");
      if (resourceScope && (resourceScope.modelName != "User")) {
        return true;
      }
      else {
        msgResponse(req, res, 404, "You are not the owner because you can't own a user.");
        return false;
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

// Render page info in a page's content, useful for dynamic headers in views
var renderPageInfo = function (res, page, template) {
  var page_tag = "page"; // this prefix could be added to site config
  var output = template;
  var pageInfo = [
    { tag: 'name',       value: page.name }
  ];
  pageInfo.forEach(function (infoItem) {
    var pattern = new RegExp("{{\\s*" + page_tag + "\\." + infoItem.tag + "\\s*}}", "gi");
    output = output.replace(pattern, infoItem.value);
  });
  res.send(output);
}

// Render site info in a page's content
var renderSiteInfo = function (res, page, template) {
  var site_tag = "site"; // this prefix could be added to site config
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
  renderPageInfo(res, page, output);
}

// Render vars in a page's content
var renderVars = function (res, page, template) {
  var var_tag = "var"; // this may move to a site config
  var output = template;
  Var.find().exec(function (err, vars) {
    if (!err && vars) {
      vars.forEach(function (vari) {
        var pattern = new RegExp("{{\\s*" + var_tag + "\\." + vari.name + "\\s*}}", "gi");
        output = output.replace(pattern, vari.value);
      });
    }
    renderSiteInfo(res, page, output);
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
    renderVars(res, page, output);
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
      Site.create(seed.Data.site, function (err) {
        console.log("Creating a site...");
        if (err) return handleError(err);

        seed.Data.users.forEach(function (user) { 
          user.salt           = randomString();
          user.pwhash         = users.saltyHash(user.password, user.salt);
          user.verifytoken    = users.makeToken();
        });
        User.create(seed.Data.users, function (err, firstuser) {
          console.log("Creating an admin user...");
          if (err) return handleError(err);

          firstuser.creator_id     = firstuser._id;
          firstuser.lastupdater_id = firstuser._id;
          firstuser.save();
          seed.Data.views.forEach(function (view) {
            view.creator_id     = firstuser._id;
            view.lastupdater_id = firstuser._id;
          });
          View.create(seed.Data.views, function (err, htmlview, cssview) {
            console.log("Creating views...");
            if (err) return handleError(err);
            
            seed.Data.pages.forEach(function (page) {
              page.view_id        = /\.css/i.test(page.path) ? cssview._id : htmlview._id;
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
      runAlertMode("Not feeling fluffy.<br/>Fluff DB already initialized.");
    }
  });
}

var mergeConfig = function (app_config, site_config) {
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
      console.log("Loaded complete config.");
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
      runAlertMode("Not feeling fluffy.<br/>Fluff DB is not initialized.");
    }
  });
}

// Create the mailer
var setupMailer = function () {
  var mailerData = {
    auth: {
      user: Fluff.app.get('config').smtp.username,
      pass: Fluff.app.get('config').smtp.password
    }
  };
  if (Fluff.app.get('config').smtp.service == "Other SMTP") {
    mailerData.host             = Fluff.app.get('config').smtp.host; // hostname
    mailerData.secureConnection = Fluff.app.get('config').smtp.ssl;  // use SSL
    mailerData.port             = Fluff.app.get('config').smtp.port;
  }
  else {
    mailerData.service = Fluff.app.get('config').smtp.service;
  }
  Fluff.mailer = nodemailer.createTransport("SMTP", mailerData);
}

Fluff.emailToUser = function(mailinfo) {
  if (mailinfo) {
    console.log("MAIL TO USER: from " + Fluff.app.get('config').email_from + ", to " + mailinfo.user.email + ", mailer info is " + JSON.stringify(Fluff.mailer));

    Fluff.mailer.sendMail({
      from:    Fluff.app.get('config').email_from,
      to:      mailinfo.user.email,
      subject: mailinfo.subject,
      text:    mailinfo.body
    }, function(error, response) {
      if(error){
        console.log('Mailer error occured:');
        console.log(error.message);
        return;
      }
      else {
        console.log("Message sent: " + response.message);
      }
      Fluff.mailer.close();
    });
  }
}

var requireApiKey = function(req, res, next) {
  console.log("**** NEW REQUEST *****");
  if (/\/api\//i.test(req.path) && app.get('config').apikey.required) {
    var apikeys = app.get('config').apikey.keychain;
    console.log("API keys are " + app.get('config').apikey.keychain);
    console.log("client API key is " + (req.headers['x-api-key'] ? req.headers['x-api-key'] : 'missing'));
    if (Object.prototype.toString.call(apikeys) === '[object Array]') {
      var ok = false;
      apikeys.forEach(function(apikey) { 
        if (req.headers['x-api-key'] && (req.headers['x-api-key'] == apikey)) {
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
      if (req.headers['x-api-key'] && (req.headers['x-api-key'] == apikeys)) {
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
      html += "<p><img src='/fluff/images/sad-fluffy.png' /></p>\n";
      html += "<p>" + message + "</p>\n";
      html += "</body>\n";
      html += "</html>";
      return html;
}

var runAlertMode = function(text, callback) {
  app.use ('/fluff', express.static(__dirname + '/public'));
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
      if (callback && (dehumanize(model.name) == dehumanize(req.params.model))) {
        switch (callback) {
          case resource.find:
            var access = model.access.view;
            break;
          case getModelInfo:
            var access = model.access.view;
            break;
          case resource.count:
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
        if (callback == getModelInfo) {
          doIfHasAccess(req, res, access, Models[model.name], function (req, res, resourceScope) {
            getModelInfo(req, res, model.name);
          });
        }
        else {
          // Make sure that the user_id is filled if needed
          if (Models[model.name]) {

          }
          doIfHasAccess(req, res, access, Models[model.name], callback);
        }
      }
    });
    if (!match) {
      next();
    }
  }
}

var getModelInfo = function (req, res, modelName) {
  if (modelName) {
    Model.where('name', modelName).exec(function (err, data) {
      if (err) { 
        msgResponse(req, res, 500, JSON.stringify(err));
      }
      else { 
        if (data) {
          var responseData = {
            schema_data     : data[0].schema_data,
            display_columns : data[0].display_columns,
            sort_column     : data[0].sort_column,
          }
          res.json(responseData);
        }
        else {
          msgResponse(req, res, 404, modelName + ' not found.');
        }
      }
    });
  }
  else {
    msgResponse(req, res, 500, "Cannot provide the schema for " + modelName + ".");
  }
}

var modelRoutes = function () {
  console.log("Adding routes for models...");
  var base = app.get('config').fluff_path + '/api';
  app.get   (base + '/:model',         function(req, res, next) {
    handleModelRequest(req, res, next, resource.find);
  });
  app.get   (base + '/:model/info',    function(req, res, next) {
    handleModelRequest(req, res, next, getModelInfo);
  });
  app.get   (base + '/:model/count',   function(req, res, next) {
    handleModelRequest(req, res, next, resource.count);
  });
  app.get   (base + '/:model/:id',     function(req, res, next) {
    handleModelRequest(req, res, next, resource.findone);
  });
  app.post  (base + '/:model',         function(req, res, next) {
    handleModelRequest(req, res, next, resource.create);
  });
  app.post  (base + '/:model/import',  function(req, res, next) {
    handleModelRequest(req, res, next, resource.import);
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

// Converts a schema object into a schema_data string
var schemaToData = function (schema) {
  var schema_data = "{\n";
  for (item in schema) {
    if (schema[item].type) {
      schema_data += item + ": { ";
      var itemObj = schema[item];
      for (subitem in itemObj) {
        schema_data += subitem + ": ";
        if (['String','Number','Boolean','ObjectId','Date'].indexOf(itemObj[subitem].name) != -1) {
          schema_data += itemObj[subitem].name;
        }
        else {
          if (typeof itemObj[subitem] == 'Date') {
            schema_data += "Date.now";
          }
          else {
            schema_data += JSON.stringify(itemObj[subitem]);
          }
        }
        schema_data += ", "
      }
      // Remove the last comma and close the brace
      schema_data = schema_data.substr(0, schema_data.length - 2);
      schema_data += " },\n";
    }
    else {
      schema_data += item + ": " + schema[item].name + ",\n";
    }
  }
  schema_data += "}";
  console.log("SCHEMA TO DATA: " + schema_data);
  return schema_data;
}
exports.schemaToData = schemaToData;

var adminRoutes = function () {
  // Setup routes using the default resource handler
  var base = app.get('config').fluff_path + '/admin/api';

  // Authentication routes
  app.get (base + '/auth',     auth.check);
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
  app.post(base + '/captcha',         users.captcha);

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
  app.get (base + '/site', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, site.findone);} );
  app.put (base + '/site', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, site.update);} );
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
  exports.siteUrl = siteUrl; // Used by some routes

  // Run all the setup routines with the latest config
  app.enable('trust proxy'); // To support proxies
  //app.use(forceSsl);         // Uses app.config ssl
  app.use(allowCrossDomain); // Uses app.config cors
  setupMailer();             // Uses app.config smtp
  app.use(requireApiKey);    // Uses app.config api_key
  app.use(csrf.check);       // Uses app.config fluff_path
  adminRoutes();             // Uses app.config fluff_path
  modelRoutes();             // Uses app.config fluff_path
  loadPlugins(function () {  // Load plugins last to allow overriding config
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
  });
}

var randomString = function (size) {
  var crypto = require('crypto');
  size = size ? size : 10;
  return crypto.randomBytes(Math.ceil(size * 3 / 4)).toString('base64').slice(0, size);
}
exports.randomString = randomString;

// Returns a random integer between min and max
// Using Math.round() will give you a non-uniform distribution!
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
exports.randomInt = randomInt;

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

var toSchemaData = function (array) {
  return "{\n\t" + array.join(": String,\n\t") + ": String\n}";
}
exports.toSchemaData = toSchemaData;

var startUp = function (req, res) {
  console.log("Starting Fluff...");
  if (app.get('config').initialize) {
    
    // Initialize db with seed data (site, admin, example page, view and vars)
    connectDb(req, res, function (req, res) {
      initDb(req, res, function (req, res) {
        initPlugins(req, res, function (req, res) {
          loadConfig (req, res, function (req, res) {
            loadModels (req, res, function (req, res) {
              applyConfig(req, res, Callback);
            });
          });
        });
      });
    });
  }
  else {
    connectDb(req, res, function (req, res) {
      initPlugins(req, res, function (req, res) {
        loadConfig (req, res, function (req, res) {
          loadModels (req, res, function (req, res) {
            applyConfig(req, res, Callback);
          });
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
    maxAge : new Date(Date.now() + 3600000) // 1 hr, should move to per user setting
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
  // This callback is a global, and it is run at the end of startUp.
  Callback = callback;
  preLaunch();
  loadDefaults(config);
  startUp();
}
exports.launch = launch;
