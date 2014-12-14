
// FLUFF MAIN APP

// Dependencies
var express        = require('express'),
    http           = require('http'),
    https          = require('https'),
    bodyParser     = require('body-parser'),
    cookieParser   = require('cookie-parser'),
    methodOverride = require('method-override'),
    staticFavicon  = require('serve-favicon'),
    session        = require('express-session'),
    mongoose       = require('mongoose'),
    mime           = require('mime'),
    multer         = require('multer'),
    nodemailer     = require('nodemailer'),
    fs             = require('fs'),
    winston        = require('winston');

// Setup globals
var Fluff       = {},
    app         = express(),
    defaultFluffPath = "/fluff",
    defaultPort = 80,
    PortChanged = false, 
    Site, User, View, Page, Var, Model, 
    Models      = {},
    Plugins     = {},
    ObjectId    = mongoose.Schema.Types.ObjectId,
    Buffer      = mongoose.Schema.Types.Buffer,
    Mixed       = mongoose.Schema.Types.Mixed,
    Server, Callback;
    Fluff.match_fields = {};
exports.Fluff  = Fluff;
Fluff.app      = app;
exports.Models = Models;

// Remaining dependencies
var config   = require('./config').config,
    site     = require('./routes/site'),
    auth     = require('./routes/auth'),
    users    = require('./routes/users'),
    views    = require('./routes/views'),
    pages    = require('./routes/pages'),
    vars     = require('./routes/vars'),
    models   = require('./routes/models'),
    resource = require('./routes/resource');

// Setup Winston logging
var winstonTrans = [
  new (winston.transports.Console)(),
  new (winston.transports.File)({ filename: './log/fluff.log', maxsize: 100000, maxFiles: 1 })
];
if (config.app_service == "Heroku") {
  var winstonTrans = [ new (winston.transports.Console)() ];
}
Fluff.log = new (winston.Logger)({
  transports: winstonTrans
});

// Helper functions
var handleError = function (err) {
  Fluff.log.info("Bad things happened: " + err);
}

// Takes an array of name/value pairs and return a val for a name
Fluff.getVal = function (array, name, nameField, valField) {
  if (array && name) {
    var returnVal;
    nameField = nameField || 'name';
    valField = valField || 'value';
    array.forEach(function (item) {
      if (item[nameField] == name) {
        returnVal = item[valField];
      }
    });
    return returnVal;
  }
  else {
    return null;
  }
}

// Returns a clone of the object or the same thing if not
var cloneObject = function (obj) {
  if ((null == obj) || ("object" != typeof obj)) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
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

var escapeRegExp = function (str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
exports.escapeRegExp = escapeRegExp;

var wipeDb = function (callback) {
  Fluff.log.info("Wiping DB...");
  Site.remove(function (err) {
    if (err) return handleError(err);
    User.remove(function (err) {
      if (err) return handleError(err);
      View.remove(function (err) {
        if (err) return handleError(err);
        Page.remove(function (err) {
          if (err) return handleError(err);
          Var.remove(function (err) {
            if (err) return handleError(err);
            Model.remove(function (err) {
              if (callback) {
                callback();
              }
            });
          });
        });
      });
    });
  });
}

var initDb = function (callback) {
  // First wipe the DB
  wipeDb(function () {
    Fluff.log.info("Initialize DB...");
    var seed = require('./seed');
    Site.create(seed.Data.site, function (err) {
      if (err) return handleError(err);
      
      Fluff.log.info("Creating a site...");
      seed.Data.users.forEach(function (user) { 
        user.salt           = randomString();
        user.pwhash         = users.saltyHash(user.password, user.salt);
        user.verifytoken    = users.makeToken();
      });
      User.create(seed.Data.users, function (err, firstuser) {
        Fluff.log.info("Creating an admin user...");
        if (err) return handleError(err);

        firstuser.creator_id     = firstuser._id;
        firstuser.lastupdater_id = firstuser._id;
        firstuser.save();
        seed.Data.views.forEach(function (view) {
          view.creator_id     = firstuser._id;
          view.lastupdater_id = firstuser._id;
        });
        View.create(seed.Data.views, function (err, htmlview, cssview) {
          Fluff.log.info("Creating views...");
          if (err) return handleError(err);
          
          seed.Data.pages.forEach(function (page) {
            page.view_id        = /\.css/i.test(page.path) ? cssview._id : htmlview._id;
            page.creator_id     = firstuser._id;
            page.lastupdater_id = firstuser._id;
          });
          Page.create(seed.Data.pages, function (err) {
            Fluff.log.info("Creating pages...");
            if (err) return handleError(err);
            
            seed.Data.vars.forEach(function (vari) {
              vari.creator_id     = firstuser._id;
              vari.lastupdater_id = firstuser._id;
            });
            Var.create(seed.Data.vars, function (err) {
              Fluff.log.info("Creating vars...");
              if (err) return handleError(err);

              seed.Data.models.forEach(function (model) {
                model.creator_id     = firstuser._id;
                model.lastupdater_id = firstuser._id;
              });
              Model.create(seed.Data.models, function (err) {
                Fluff.log.info("Creating a model...");
                if (err) return handleError(err);

                Fluff.log.info("Initialized DB with seed data.");
                if (callback) {
                  callback();
                }
                else {
                  loadConfig();
                }
              });
            });
          });
        });
      });
    });
  });
}

var setupSchemas = function (callback) {
  // Create schemas and use them to register the models
  if (Object.keys(mongooseCollections()).length == 0) {
    Fluff.log.info("Setting up the required schemas...");
    var userSchema = toSchema(users.schema);
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
    userSchema.methods.pwMatch = function (password, debug) {
      var crypto = require('crypto');
      var hash   = crypto.createHash('md5').update(password + this.salt).digest("hex");
      if (debug) {
        Fluff.log.info('DEBUG password: ' + password);
        Fluff.log.info('DEBUG client hash: ' + hash);
        Fluff.log.info('DEBUG db hash: ' + this.pwhash);
      }
      return (this.pwhash == hash) ?
        true : false;
    }
    User   = mongoose.model('User', userSchema);
    Fluff.match_fields[User.modelName] = users.match_fields;
    exports.User = User;

    var siteSchema = toSchema(site.schema);
    Site           = mongoose.model('Site', siteSchema);
    Fluff.match_fields[Site.modelName] = site.match_fields;
    exports.Site = Site;

    var viewSchema = toSchema(views.schema);
    View           = mongoose.model('View', viewSchema);
    Fluff.match_fields[View.modelName] = views.match_fields;

    var pageSchema = toSchema(pages.schema);
    Page           = mongoose.model('Page', pageSchema);
    Fluff.match_fields[Page.modelName] = pages.match_fields;

    var varSchema  = toSchema(vars.schema);
    Var            = mongoose.model('Var', varSchema);
    Fluff.match_fields[Var.modelName] = vars.match_fields;

    var modelSchema  = toSchema(models.schema);
    Model            = mongoose.model('Model', modelSchema);
    Fluff.match_fields[Model.modelName] = models.match_fields;
    exports.Model = Model;
  }
  if (callback) {
    callback();
  }
}

// Setup DB connection
var connectDb = function (callback) {
  Fluff.log.info("Connecting to " + app.get('config').db_uri);
  mongoose.connect(app.get('config').db_uri, function(err) {
    if (err) {
      Fluff.log.info("DB connect error: " + JSON.stringify(err));
      runAlertMode('bad_db_uri');
    }
    else {
      if (callback) {
        callback();
      }
    }
  });
}

// Useful for direct manipulation of DB collections
var mongooseCollection = function (model) {
  return mongoose.connection.collections[dehumanize(model.model_id)];
}
var mongooseCollections = function () {
  return mongoose.connection.collections;
}
exports.mongooseCollection  = mongooseCollection;
exports.mongooseCollections = mongooseCollections;

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


// Init all plugins; they are initialized synchronously in directory order
var initPlugins = function (callback) {
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
          Fluff.log.info("Detected plugins: " + plugins.join(", "));
          initOnePlugin(plugins, 0, callback);
        }
        else {
          Fluff.log.info("No plugins detected.");
          if (callback) {
            callback();
          }
        }
      });
    }
    else {
      if (callback) {
        callback();
      }
    }
  });
}

// Returns the index of the object in an array that has the matching field, if no match then returns the length of the array.
var getIndexByMatch = function (array, field, value) {
  var matchIndex = array.length;
  array.forEach(function (object, index) {
    if (object[field] == value) {
      matchIndex = index;
    }
  });
  return matchIndex;
}

// Init one plugin; you need the directory list and index of the plugin in the list
var initOnePlugin = function (dirs, index, callback) {
  var path = __dirname + '/plugins';
  index = index ? index : 0;
  var name = dirs[index];
  // Skip directories that do not contain plug.js
  fs.exists(path + '/' + name + '/plug.js', function (exists) {
    if (exists) {
      if (Plugins[name]) {
        Fluff.log.info("Could not initialize " + name + " plugin as another already exists with the same name.");
        finishInitPlugin(dirs, index, callback);
      }
      else {
        Plugins[name] = require('./plugins/' + name + '/plug');
        Plugins[name].init(function () {
          if (Plugins[name].info) {
            Plugins[name].info.slug = name;
            var siteConfig = app.get('config');
            var pluginIndex = 0, disabled = false, config = [];
            var plugins = app.get('config').plugins;
            if (plugins) {
              pluginIndex = getIndexByMatch(plugins, 'slug', name);
              if (plugins[pluginIndex]) {
                if (plugins[pluginIndex].disabled) {
                  disabled = true;
                }
                // Make sure that the config is using the correct set of fields
                if (!plugins[pluginIndex].config) {plugins[pluginIndex].config = [];}
                if (!Plugins[name].config_fields) {Plugins[name].config_fields = [];}
                config = plugins[pluginIndex].config;
                // Remove the field if the plugin doesn't use it
                config.forEach(function (field, fieldIndex) {
                  if (Plugins[name].config_fields.indexOf(field.name) == -1) {
                    config.splice(fieldIndex, 1);
                  }
                });
                
              }
            }
            // Make sure the fields are all there
            Plugins[name].config_fields.forEach(function (field) {
              if (flattenArray(config, 'name').indexOf(field) == -1) {
                config.push({name: field, value: ''});
              }
            });
            siteConfig.plugins[pluginIndex] = {
              name: Plugins[name].info.name,
              slug:  Plugins[name].info.slug,
              description: Plugins[name].info.description,
              author: Plugins[name].info.author,
              license: Plugins[name].info.license,
              version: Plugins[name].info.version,
              date: Plugins[name].info.date,
              disabled: disabled,
              config: config
            };
            if (siteConfig._id) { delete siteConfig._id; }
            if (siteConfig.id) { delete siteConfig.id; }
            if (siteConfig.lastupdater_id) { delete siteConfig.lastupdater_id; }
            siteConfig.lastupdate = new Date();
            Site.findOneAndUpdate(null, siteConfig, null, function (err, site) {
              if (!err && site) {
                Fluff.log.info("Initialized " + name + " plugin.");
              }
              else {
                Fluff.log.info("Failed to save " + name + " plugin info to DB. Error: " + JSON.stringify(err));
              }
              finishInitPlugin(dirs, index, callback);
            });
          }
          else {
            Fluff.log.info("Initialized " + name + " plugin without config.");
            finishInitPlugin(dirs, index, callback);
          }
        });
      }
    }
    else {
      Fluff.log.info("Could not find plug.js in the /plugins/" + name + " directory.");
      finishInitPlugin(dirs, index, callback);
    }
  });
}

// Run after each plugin is initialized
var finishInitPlugin = function (dirs, index, callback) {
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
      initOnePlugin(dirs, index + 1, callback);
    }
  }
  else {
    if (callback) {
      callback();
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
      Fluff.log.info("Loaded " + name + " plugin.");
      if (callback) {
        callback();
      }
    });
  }
  else {
    Fluff.log.info("Could not load " + name + " plugin as it was not initialized.");
    if (callback) {
      callback();
    }
  }
}

// Load the default config
var loadDefaults = function (custom_config) {
  var active_config = config || {};
  // If this function is passed a specific config, then prefer that one
  if (custom_config) {
    active_config = custom_config;
  }
  active_config.fluff_path = active_config.fluff_path || defaultFluffPath;
  active_config.port = active_config.port || defaultPort;
  externalPort = active_config.port;
  Fluff.log.info("After loading defaults, ext port is: " + externalPort);
  Fluff.log.info("After loading defaults, int port is: " + active_config.port);
  Fluff.log.info("After loading defaults, DB URI is: " + active_config.db_uri);
  app.set('config', mergePaasConfig(active_config));
}

// If on OpsWorks, Heroku or AppFog then fix config
var mergePaasConfig = function (active_config) {
  switch (active_config.app_service) {
    case "OpsWorks":
      if (process.env.MONGOLAB_URI) {
        active_config.db_uri = process.env.MONGOLAB_URI;
      }
      active_config.port = process.env.PORT ? process.env.PORT : active_config.port;
      break;
    case "Heroku":
      if (process.env.MONGOLAB_URI) {
        active_config.db_uri = process.env.MONGOLAB_URI;
      }
      active_config.port = process.env.PORT ? process.env.PORT : active_config.port;
      break;
    case "AppFog":
      if (process.env.VCAP_SERVICES) {
        var env   = JSON.parse(process.env.VCAP_SERVICES);
        var obj   = env['mongodb-1.8'][0]['credentials'];
        var cred  = '';
        if (obj.username && obj.password) {
          cred = obj.username + ":" + obj.password + "@";
        }
        var dburi = "mongodb://" + cred + obj.hostname + ":" + obj.port + "/" + obj.db;
        active_config.db_uri = dburi;
      }
      active_config.port = process.env.VMC_APP_PORT ? process.env.VMC_APP_PORT : defaultPort;
      break;
    default:
      if (process.env.MONGOLAB_URI) {
        active_config.db_uri = process.env.MONGOLAB_URI;
      }
      active_config.port = process.env.PORT ? process.env.PORT : active_config.port;
  }
  Fluff.log.info("After merge PaaS config, ext port is: " + externalPort);
  Fluff.log.info("After merge PaaS config, int port is: " + active_config.port);
  Fluff.log.info("After merge PaaS config, DB URI is: " + active_config.db_uri);
  return active_config;
}

// Force SSL if required
var forceSsl = function (req, res, next) {
  Fluff.log.info("SSL IS [" + app.get('config').ssl + "]");
  if (app.get('config').ssl) {
    if (req.headers['x-forwarded-proto'] != 'https') {
      res.redirect(Fluff.externalUrl);
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
  if (app.get('config').cors.restricted) { 
    // Allow access only to whitelist and self
    if ((app.get('config').cors.whitelist.indexOf(req.headers.origin) == -1) && (app.get('config').cors.whitelist.indexOf("http://" + req.headers.host) == -1) && (app.get('config').cors.whitelist.indexOf("https://" + req.headers.host == -1))) {
      Fluff.log.info("DENIED ORIGIN: '" + (req.headers.origin || req.headers.host) + "'");
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

// Checks the captcha using reCaptcha service
Fluff.checkCaptcha = function (req, res, callback) {
  if (app.get('config').captcha && app.get('config').captcha.recaptcha_private_key && app.get('config').captcha.recaptcha_private_key != '') {
    var ra = require('recaptcha-async');
    var recaptcha = new ra.reCaptcha();
    recaptcha.on('data', function (response) {
      if (callback) {
        callback(req, res, response.is_valid);
      }
    });
    var recaptcha_challenge_field = req.body.recaptcha_challenge_field;
    var recaptcha_response_field  = req.body.recaptcha_response_field;
    Fluff.log.info("Checking captcha...");
    recaptcha.checkAnswer(app.get('config').captcha.recaptcha_private_key, 
      req.connection.remoteAddress, 
      recaptcha_challenge_field, 
      recaptcha_response_field);
  }
  else {
    Fluff.log.info("Config is missing reCaptcha private key.");
    if (callback) {
      callback(req, res, false);
    }
  }
};

// This needs some cleanup, combine with HasAccess
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
        Fluff.checkCaptcha(req, res, function (req, res, verified) {
          if (verified) {
            req.session.human = true;
            Fluff.log.info("Captcha verified.");
            callback(req, res, resourceScope);
          }
          else {
            var msg = "Captcha not verified. Sorry, humans only.";
            Fluff.msgResponse(req, res, 401, msg);
          }
        });
      }
    }
    else {
      if (HasAccess(req, res, level, resourceScope)) {
        // if restricted to owner then positive result still needs to match user_id or be admin
        if (level == "Owner") {
          if ((req.session.user.role) && (req.session.user.role == 'Admin')) {
            Fluff.log.info(req.session.user.id + " has access to the requested item.");
            callback(req, res, resourceScope);
          }
          else {
            if (req.params.id) {
              resourceScope.findOne({_id: req.params.id}).exec(function (err, data) {
                if (data && (req.session.user.id == data.user_id)) {
                  Fluff.log.info(req.session.user.id + " has access to the requested item.");
                  callback(req, res, resourceScope);
                }
                else {
                  Fluff.msgResponse(req, res, 401, "You must be the owner.");
                }
              });
            }
            else {
              // Allowed
              Fluff.log.info(req.session.user.id + " has access to the requested item.");
              callback(req, res, resourceScope);
            }
          }
        }
        else {
          // Special case for update site and model which require reload config
          if ((['PUT','PATCH','POST','DELETE'].indexOf(req.method) != -1) && ([Site, Model].indexOf(resourceScope) != -1)) { 
            callback(req, res, resourceScope, null, reloadConfig);
          }
          else {
            // Allowed
            callback(req, res, resourceScope);
          }
        }
      }
    }
  }
}
exports.doIfHasAccess = doIfHasAccess;

var HasAccess = function(req, res, level, resourceScope){
  Fluff.log.info("The requested resource is: " + (resourceScope ? resourceScope.modelName : 'none'));
  if (req.session.auth && (req.session.user.status == 'Active')) {
    switch (level) {
    case 'Users':
      Fluff.log.info("Restricted to users only.");
      if (resourceScope) {
        // Handle the special case of user access to users
        if (resourceScope.modelName == "User") {
          if (req.params && (req.session.user.id == req.params.id)) {
            return true;
          }
          else {
            if ((req.session.user.role) && (req.session.user.role == 'Admin')) {
              return true;
            }
            else {
              Fluff.msgResponse(req, res, 403, "You must be the correct user or admin.");
              return false;
            }
          }
        }
        else {
          return true;
        }
      }
      else {
        return true;
      }
      break;
    case 'Owner':
      Fluff.log.info("Restricted to owner only.");
      if (resourceScope && (resourceScope.modelName != "User")) {
        return true;
      }
      else {
        Fluff.msgResponse(req, res, 404, "You are not the owner because you can't own a user.");
        return false;
      }
      break;
    case 'Admins':
      Fluff.log.info("Restricted to admins only.");
      if ((req.session.user.role) && (req.session.user.role == 'Admin')) {
        return true;
      }
      else {
        Fluff.msgResponse(req, res, 403, "You must be admin.");
        return false;
      }
      break;
    default:
      Fluff.log.info("Access level is not working: " + level);
      return false;
    }
  }
  else {
    Fluff.msgResponse(req, res, 403, "You must be logged in.");
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
    { tag: 'url',        value: (app.get('config').ssl ? 'https://' : 'http://') + app.get('config').domain_name + ((!app.get('config').ssl && (app.get('config').port != 80)) ? app.get('config').port : '') },
    { tag: 'domain',     value: app.get('config').domain_name },
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
    Fluff.log.info("Looking up pages...");
    Page.findOne({"path": url}).exec(function (err, data) {
      if (!err && data) { 
        Fluff.log.info("Matched a page path.");
        if (data.get('status') == "Published") {
          if (data.get('access') == "Public") {
            renderView(res, data);
          }
          else {
            Fluff.log.info("Access requested by " + data.get('access'));
            if (HasAccess(req, res, data.get('access'), Page)) {
              renderView(res, data);
            }
            else {
              next();
            }
          }
        }
        else {
          Fluff.log.info("The requested page is unpublished.");
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
    Fluff.log.info("Favicon requested.");
    next();
  }
}

// site_config is the config stored in the DB
var mergeConfig = function (app_config, site_config) {
  for (item in site_config) {
    // Traverse the object tree
    if ((Object.prototype.toString.call(site_config[item]) === '[object Object]') && (Object.keys(site_config[item]).length > 0)) {
      if (!app_config.hasOwnProperty(item)){
        app_config[item] = {};
      }
      for (sub_item in site_config[item]) {
        app_config[item][sub_item] = site_config[item][sub_item];
      }
    }
    else {
      app_config[item] = site_config[item];
    }
  }
  // The external port is forced by the DB config
  externalPort = app_config.port || externalPort;
  Fluff.log.info("After merge DB config, ext port is: " + externalPort);
  Fluff.log.info("After merge DB config, int port is: " + app_config.port);
  Fluff.log.info("After merge DB config, DB URI is: " + app_config.db_uri);
  return mergePaasConfig(app_config);
}

// Load the site config from the db
var loadConfig = function (callback) {
  Fluff.log.info("Loading config from DB...");
  Site.findOne().exec(function (err, data) {
    if (!err && data) {
      var active_config = app.get('config');
      var stored_config = data.toJSON();
      app.set('config', mergeConfig(active_config, stored_config));
      Fluff.log.info("Loaded complete config.");
      if (callback) {
        callback();
      }
      else {
        applyConfig();
      }
    }
    else {
      if (!data) {
        Fluff.log.info("No site found in the DB.");
        runAlertMode('no_site');
      }
      else {
        Fluff.log.info("DB load error: " + err);
        runAlertMode('bad_db');
      }
      Fluff.log.info("Point to another DB and restart Fluff, or set 'initialize' to true in config.js.");
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
  if (Fluff.app.get('config').smtp.service == "SMTP") {
    mailerData.host   = Fluff.app.get('config').smtp.host; // hostname
    mailerData.secure = Fluff.app.get('config').smtp.ssl;  // use SSL
    mailerData.port   = Fluff.app.get('config').smtp.port;
  }
  else {
    mailerData.service = Fluff.app.get('config').smtp.service;
  }
  Fluff.mailer = nodemailer.createTransport(mailerData);
}

Fluff.emailToUser = function(mailinfo) {
  if (mailinfo) {
    Fluff.log.info("MAIL TO USER: from " + Fluff.app.get('config').email_from + ", to " + mailinfo.user.email + ", mailer info is " + JSON.stringify(Fluff.mailer));

    Fluff.mailer.sendMail({
      from:    Fluff.app.get('config').email_from,
      to:      mailinfo.user.email,
      subject: mailinfo.subject,
      text:    mailinfo.body
    }, function(error, info) {
      if(error){
        Fluff.log.info('Mailer error occured:');
        Fluff.log.info(error.message);
        return;
      }
      else {
        Fluff.log.info("Message sent: " + info.response);
      }
      Fluff.mailer.close();
    });
  }
}

var requireApiKey = function(req, res, next) {
  if (/\/api\//i.test(req.path) && app.get('config').apikey.required) {
    var apikeys = app.get('config').apikey.keychain;
    Fluff.log.info("API keys are " + app.get('config').apikey.keychain);
    Fluff.log.info("client API key is " + (req.headers['x-api-key'] ? req.headers['x-api-key'] : 'missing'));
    if (Object.prototype.toString.call(apikeys) === '[object Array]') {
      var ok = false;
      apikeys.forEach(function(apikey) { 
        if (req.headers['x-api-key'] && (req.headers['x-api-key'] == apikey)) {
          ok = true;
        }
      });
      if (ok) {
        Fluff.log.info("API key OK.");
        next();
      }
      else {
        Fluff.log.info("API key is bad.");
        Fluff.msgResponse(req, res, 403, "API key is missing or invalid from array.");
      }
    }
    else {
      if (req.headers['x-api-key'] && (req.headers['x-api-key'] == apikeys)) {
        Fluff.log.info("API key OK.");
        next();
      }
      else {
        Fluff.log.info("API key is bad.");
        Fluff.msgResponse(req, res, 403, "API key is missing or invalid from string.");
      }
    }
  }
  else {
    Fluff.log.info("API key not required.");
    next();
  }
}

// Don't like html strings in js, but it works
var defaultAlertPage = function(message) {
  var html = '\n\
  <html> \n\
  <head> \n\
    <title>Fluff Alert</title> \n\
    <script src="/fluff/js/jquery.js"></script> \n\
    <script> \n\
    var updateDbUri = function () { \n\
      $.ajax({ \n\
        type: "POST", \n\
        url: "/fluff/admin/api/db", \n\
        data: { \n\
          alert_token: $("input[name=alert_token]").val(), \n\
          db_uri: $("input[name=db_uri]").val() \n\
        }, \n\
        success: function (data, status, xhr) { \n\
          var delay = 3000; \n\
          if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).delay) { \n\
            delay = parseInt($.parseJSON(xhr.responseText).delay) * 1000; \n\
          } \n\
          setTimeout(function () { \n\
            window.location.href = "/"; \n\
          }, delay); \n\
        }, \n\
        error: function (xhr) { \n\
          console.log("Save DB URI didn\'t work."); \n\
        } \n\
      }); \n\
    } \n\
    var initDb = function () { \n\
      $.ajax({ \n\
        type: "POST", \n\
        url: "/fluff/admin/api/db/init", \n\
        data: { \n\
          alert_token: $("input[name=alert_token]").val() \n\
        }, \n\
        success: function (data, status, xhr) { \n\
          var delay = 3000; \n\
          if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).delay) { \n\
            delay = parseInt($.parseJSON(xhr.responseText).delay) * 1000; \n\
          } \n\
          setTimeout(function () { \n\
            window.location.href = "/"; \n\
          }, delay); \n\
        }, \n\
        error: function (xhr) { \n\
          console.log("Initialization didn\'t work."); \n\
        } \n\
      }); \n\
    } \n\
    </script> \n\
    <style> \n\
      p { \n\
        font-size:18pt; \n\
        font-family:helvetica,arial; \n\
        color:#606060; \n\
        text-align:center; \n\
        margin-top:50px; \n\
      } \n\
      form { \n\
        width:400px; \n\
        margin-left:auto; \n\
        margin-right:auto; \n\
      } \n\
      input { \n\
        font-family:helvetica,arial; \n\
        color:#606060; \n\
        text-align:center; \n\
      } \n\
      input[type=text] { \n\
        font-size:18pt; \n\
        width:100%; \n\
        margin-top:10px; \n\
      } \n\
      input[type=submit] { \n\
        font-size:108pt; \n\
        width:100px; \n\
        height:100px; \n\
        margin-top:30px; \n\
        margin-left:auto; \n\
        margin-right:auto; \n\
      } \n\
    </style> \n\
  </head> \n\
  <body> \n\
    <p><img src="/fluff/images/sad-fluffy.png" /></p> \n\
    ' + message + ' \n\
  </body> \n\
  </html> \n';
  return html;
}

// This mode runs when DB cannot be used
var runAlertMode = function(level, callback) {
  switch (level) {
    case 'not_fluff_db':
      text = '\
        <p>Not feeling fluffy.<br/> There\'s a database, but it\'s not a Fluff DB.</p> \n\
        <form action="/fluff/admin/api/db" method="post"> \n\
          <input type="text" name="db_uri" placeholder="Enter a database URI" /><br/> \n\
          <input type="text" name="alert_token" placeholder="Enter your alert token" /><br/> \n\
          <button type="button" onclick="updateDbUri()"/>SAVE</button> \n\
          <button type="button" onclick="initDb()"/>INITIALIZE</button> \n\
        </form> \n\
      ';
      break;
    case 'bad_db_uri':
      text = '\
        <p>Not feeling fluffy.<br/> The database URI is not working.</p> \n\
        <form action="/fluff/admin/api/db" method="post"> \n\
          <input type="text" name="db_uri" placeholder="Enter a database URI" /><br/> \n\
          <input type="text" name="alert_token" placeholder="Enter your alert token" /><br/> \n\
          <button type="button" onclick="updateDbUri()"/>SAVE</button> \n\
        </form> \n\
      ';
      break;
    default: // no_db_uri; TBD make token input only show if required
      text = '\
        <p>Not feeling fluffy.<br/> The database URI is not set.</p> \n\
        <form action="/fluff/admin/api/db" method="post"> \n\
          <input type="text" name="db_uri" placeholder="Enter a database URI" /><br/> \n\
          <input type="text" name="alert_token" placeholder="Enter your alert token" /><br/> \n\
          <button type="button" onclick="updateDbUri()"/>SAVE</button> \n\
        </form> \n\
      ';
  }
  app.use  ('/fluff', express.static(__dirname + '/public'));
  app.post ('/fluff/admin/api/db/init', function (req, res) {
    if (req.body.alert_token) {
      if (req.body.alert_token == app.get('config').alert_token) {
        initDb(function () {
          res.json({msg: "Initialized database.", delay: 10});
          // Remove the alert mode routes
          removeRoutes("*");
          // Close the DB connection as it will be reopened in the startup sequence
          mongoose.connection.close(function () {
            startUp();
          });
        });
      }
      else {
        Fluff.msgResponse(req, res, 403, "Your alert key is invalid.");
      }
    }
    else {
      Fluff.msgResponse(req, res, 401, "No alert_key in the body.");
    }
  });
  app.post ('/fluff/admin/api/db', function (req, res) {
    if (req.body.db_uri) {
      if (req.body.alert_token) {
        if (req.body.alert_token == app.get('config').alert_token) {
          // Close the DB connection if it's not closed already
          if (mongoose.connection.readyState != 0) {
            mongoose.connection.close(function () {
              console.log('DB connection closed.');
              saveDbUri(req.body.db_uri, function () {
                res.json({msg: "Saved DB URI to config.", delay: 10});
                // Remove the alert mode routes
                removeRoutes("*");
                startUp();
              });
            });
          }
          else {
            saveDbUri(req.body.db_uri, function () {
              res.json({msg: "Saved DB URI to config.", delay: 10});
              // Remove the alert mode routes
              removeRoutes("*");
              startUp();
            });
          }
        }
        else {
          Fluff.msgResponse(req, res, 403, "Your alert key is invalid.");
        }
      }
      else {
        Fluff.msgResponse(req, res, 401, "No alert_key in the body.");
      }
    }
    else {
      Fluff.msgResponse(req, res, 401, "No db_uri in the body.");
    }
  });
  // Any other API requests will return 500
  notFoundRoute(500, 'Fluff is running in alert mode. Please check the home page.');
  // All other requests return the alert page
  app.all ('*', function(req, res) {
    res.status = 500;
    res.send(defaultAlertPage(text));
  });
  setupServer();
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
          case models.getModelInfo:
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
        Fluff.log.info("Processing request for " + model.name);
        if (callback == models.getModelInfo) {
          doIfHasAccess(req, res, access, Models[model.name], function (req, res, resourceScope) {
            models.getModelInfo(req, res, model.name);
          });
        }
        else {
          doIfHasAccess(req, res, access, Models[model.name], callback);
        }
      }
    });
    if (!match) {
      next();
    }
  }
}

var modelRoutes = function () {
  Fluff.log.info("Adding routes for models...");
  var base = app.get('config').fluff_path + '/api';
  app.get   (base + '/:model',         function(req, res, next) {
    handleModelRequest(req, res, next, resource.find);
  });
  app.get   (base + '/:model/info',    function(req, res, next) {
    handleModelRequest(req, res, next, models.getModelInfo);
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
  app.delete   (base + '/:model/:id',     function(req, res, next) {
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
    Fluff.log.info("Loaded model: " + model.name);
  }
  else {
    Fluff.log.info("The model " + model.name + " could not be loaded.");
  }
}
exports.loadOneModel = loadOneModel;

var loadModels = function (callback) {
  Fluff.log.info("Loading models from DB...");
  Model.find().exec(function (err, models) {
    models.forEach(function (model) {
      Models[model.name] = toModel(model);
      loadOneModel(model);
    });
    if (callback) {
      callback();
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
  Fluff.log.info("SCHEMA TO DATA: " + schema_data);
  return schema_data;
}
exports.schemaToData = schemaToData;

var adminRoutes = function () {
  // Setup routes using the default resource handler
  var base = app.get('config').fluff_path + '/admin/api';

  // Authentication routes
  app.get    (base + '/auth',     auth.check);
  app.post   (base + '/auth',     auth.attach);
  app.put    (base + '/auth/:id', auth.attach);
  app.delete (base + '/auth/:id', auth.detach);
  app.post   (base + '/captcha',  auth.captcha);

  // User routes
  app.get    (base + '/users',           users.find);
  app.get    (base + '/users/info',      users.getinfo);
  app.get    (base + '/users/:id',       users.findone);
  app.post   (base + '/users',           users.create);
  app.put    (base + '/users/:id',       users.update);
  app.patch  (base + '/users/:id',       users.update);
  app.delete (base + '/users/:id',       users.remove);
  app.put    (base + '/verify/:token',   users.verify);
  app.put    (base + '/pwreset/:email',  users.pwreset);
  app.put    (base + '/pwchange/:token', users.pwchange);

  // Page routes
  app.get    (base + '/pages',      function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.find);} );
  app.get    (base + '/pages/info', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, pages.getinfo);} );
  app.get    (base + '/pages/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.findone);} );
  app.post   (base + '/pages',      function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.create);} );
  app.put    (base + '/pages/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.update);} );
  app.patch  (base + '/pages/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.update);} );
  app.delete (base + '/pages/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.remove);} );

  // View routes
  app.get    (base + '/views',      function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.find);} );
  app.get    (base + '/views/info', function(req, res) {doIfHasAccess(req, res, 'Admins', View, views.getinfo);} );
  app.get    (base + '/views/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.findone);} );
  app.post   (base + '/views',      function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.create);} );
  app.put    (base + '/views/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.update);} );
  app.patch  (base + '/views/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.update);} );
  app.delete (base + '/views/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', View, removeIfNotLast);} );

  // Var routes
  app.get    (base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.find);} );
  app.get    (base + '/vars/info', function(req, res) {doIfHasAccess(req, res, 'Admins', Var, vars.getinfo);} );
  app.get    (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.findone);} );
  app.post   (base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.create);} );
  app.put    (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.update);} );
  app.patch  (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.update);} );
  app.delete (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.remove);} );

  // Model routes
  app.get     (base + '/models',      models.find);
  app.get     (base + '/models/info', models.getinfo);
  app.get     (base + '/models/:id',  models.findone);
  app.post    (base + '/models',      models.create);
  app.put     (base + '/models/:id',  models.update);
  app.patch   (base + '/models/:id',  models.update);
  app.delete  (base + '/models/:id',  models.remove);

  // Site routes (only one site can be used at this time)
  app.get   (base + '/site', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, site.findone);} );
  app.put   (base + '/site', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, site.update);} );
  app.patch (base + '/site', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, site.update);} );
}

var staticType = function (req, res, next) {
  mime.default_type = "text/html";
  var type = mime.lookup(req.path);
  var charset = mime.charsets.lookup(type);
  Fluff.log.info("MIME type is " + type);
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
  app.use(app.get('config').fluff_path + '/user', 
    express.static(__dirname + '/user'));
}

// Put some useful data in the logs
var logRequest = function (req, res, next) {
  var body = cloneObject(req.body);
  // Do not include passwords in logs
  if (body.password) {
    body.password = "[private]";
  }
  if (body.confirmPassword) {
    body.confirmPassword = "[private]";
  }
  Fluff.log.info("**** NEW REQUEST ****");
  Fluff.log.info("REQ " + req.method + ": " + req.path + " from " + req.ip);
  Fluff.log.info("REQ BODY: " + JSON.stringify(body));
  Fluff.log.info("REQ HEADERS: " + JSON.stringify(req.headers));
  Fluff.log.info("REQ QUERY: " + JSON.stringify(req.query));
  next();
}

var setProtocol = function (req, res, next) {
  // externalBaseUrl is useful for email notifications which link back to the site
  if (app.get('config').ssl) {
    var protocol = "https://";
  } 
  else {
    var protocol = "http://";
  }
  Fluff.externalBaseUrl = protocol + app.get('config').domain_name + ":" + externalPort;
  Fluff.externalUrl     = Fluff.externalBaseUrl + req.url;
  Fluff.log.info("EXTERNAL URL IS "+ Fluff.externalUrl);
  next();
}

var setupServer = function () {
  if (!Server) {
    if (app.get('config').ssl) {
      Server = https.createServer(app);
    } 
    else {
      Server = http.createServer(app);
    }
  }
}

// Every time the site config changes this is run. Could be more efficient.
var applyConfig = function (callback) {
  // Run all the setup routines with the latest config
  setupServer();             // Uses app.config ssl
  setupMailer();             // Uses app.config smtp
  app.enable('trust proxy'); // To support proxies
  app.use(logRequest);       // Log requet data without passwords
  app.use(setProtocol);      // Uses app.config ssl
  app.use(forceSsl);         // Uses app.config ssl
  app.use(allowCrossDomain); // Uses app.config cors
  app.use(requireApiKey);    // Uses app.config api_key
  app.use(checkToken);       // Uses app.config fluff_path
  loadPlugins(function () {  // Load plugins last to allow overriding config
    adminRoutes();           // Uses app.config fluff_path
    modelRoutes();           // Uses app.config fluff_path
    notFoundRoute();         // Uses app.config fluff_path
    app.use(cmsPages);       // Doesn't use app.config, but runs on every request
    staticFiles();           // Static files are processed last
    // Restart the server if the port is changed
    if (Server.address()) {
      Fluff.log.info("Running on port " + Server.address().port);
      if (Server.address().port != app.get('config').port) {
        var time = new Date();
        Fluff.log.info("Closing server at " + time + " and waiting for connections to time out...");
        Server.close(function (req, res, callback) {
          Fluff.log.info("Starting back up at " + time + " and reloading config from DB...");
          startListening(true, callback);
        });
      }
      else {
        // Not really starting as already started
        startListening(true, callback, true);
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

// Checks the CSRF token when it's required
var checkToken = function(req, res, next){
  var apikey = req.session.apikey;
  var token = req.session._csrf || (req.session._csrf = randomString(24));
  var val = (req.body && req.body._csrf)
    || (req.query && req.query._csrf)
    || (req.headers['x-csrf-token']);
  Fluff.log.info("CSRF on server: " + token + " for session " + req.session.id + " for " + (req.session.user ? req.session.user.email : "unknown user"));
  Fluff.log.info("CSRF from client: " + val);
  var bypass = false;
  if (
    ( 
       // allow signup, verify, pwreset, pwchange, and login without csrf
       ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method)
    )
    || (
      (req.method == 'POST')
      && (
        (req.path == (app.get('config').fluff_path + '/admin/api/users'))
        || (req.path == (app.get('config').fluff_path + '/admin/api/auth'))
        || (req.path == (app.get('config').fluff_path + '/admin/api/identities'))
        || (req.path == (app.get('config').fluff_path + '/admin/api/captcha'))
      )
    ) 
    || (
      (req.method == 'PUT')
      && (/\/admin\/api\/verify/i.test(req.path))
    ) 
    || (
      (req.method == 'PUT')
      && (/\/admin\/api\/pwreset/i.test(req.path))
    ) 
    || (
      (req.method == 'PUT')
      && (/\/admin\/api\/pwchange/i.test(req.path))
    ) 
  ) {
    bypass = true;
    Fluff.log.info("CSRF NOT REQUIRED");
  }
  if ((val != token) && (!bypass)) {
    //return next({auth: false});
    Fluff.msgResponse(req, res, 400, "CSRF missing or incorrect.");
  }
  else {
    next();
  }
}

// Removes routes that match regex, this only works with Express 4+
var removeRoutes = function (regex) {
  app._router.stack.forEach(function (item, index) {
    if (item.route) {
      if (regex == "*") {
        Fluff.log.info("Removing route: " + item.route.path);
        app._router.stack.splice(index, 1);
      }
      else {
        if (item.route.path.match(regex)) {
          Fluff.log.info("Removing route: " + item.route.path);
          app._router.stack.splice(index, 1);
        }
      }
    }
  });
}
exports.removeRoutes = removeRoutes;

// Sets up a 404 response for any requests that don't match a route
var notFoundRoute = function (status, message) {
  var base = app.get('config').fluff_path;
  var stat = status || 404;
  var msg  = message || "The requested resource does not exist.";
  app.all (base + '/api/*', function(req, res) {
    res.status = stat;
    res.json({msg: msg});
  });
  app.all (base + '/admin/api/*', function(req, res) {
    res.status = stat;
    res.json({msg: msg});
  });
}

// Make sure it's not the last item in cases where at least one is required
var removeIfNotLast = function (req, res, resourceScope) {
  var msg = "Sorry, you can't remove the last " + resourceScope.modelName + ".";
  resourceScope.count().exec(function (err, count) {
    if (!err && (count > 1)) { 
      Fluff.log.info("More than one " + resourceScope.modelName + " left.");
      resourceScope.remove({_id: req.params.id}, function (err) {
        if (err) { msg = err; }
        else { msg = { msg: resourceScope.modelName + " removed."}; }
        Fluff.msgResponse(req, res, null, msg);
      });
    }
    else {
      Fluff.msgResponse(req, res, 403, msg);
    }
  });
}

var toSchemaData = function (array) {
  return "{\n\t" + array.join(": String,\n\t") + ": String\n}";
}
exports.toSchemaData = toSchemaData;

// Save a new DB URI to config.js
var saveDbUri = function (uri, callback) {
  active_config = app.get('config');
  active_config.db_uri = uri;
  var content = "exports.config = " + JSON.stringify(active_config);
  fs.writeFile(__dirname + '/config.js', content, function (err) {
    if (err) throw err;
    Fluff.log.info('New DB URI saved to config.js.');
    app.set('config', active_config);
    if (callback) {
      callback();
    }
  });
}

// Check that the DB has site config
var checkDb = function (callback) {
  mongoose.connection.db.collectionNames(function (err, dbCollections) {
    Fluff.log.info("DB has " + dbCollections.length + " collections.");
    // Need to check before schemas setup, or it will count them as collections even if they aren't in the DB
    if (dbCollections.length > 0) {
      setupSchemas(function () {
        // Check for site data
        Site.count().exec(function (err, count) {
          if (err) {
            // Something wrong with the DB
            runAlertMode('bad_db_uri');
          }
          else {
            if (count == 0) {
              // The DB has non-Fluff data
              runAlertMode('not_fluff_db');
            }
            else {
              // Good to go
              if (callback) {
                callback();
              }
            }
          }
        });
      });
    }
    else {
      // There's nothing in the DB, so initialize
      setupSchemas(function () {
        initDb(callback);
      });
    }
  });
}

// Startup sequence
var startUp = function (launchConfig) {
  // Load data from config.js and check for env variables
  loadDefaults(launchConfig || config);
  // Make sure the bd_uri at least looks like a MongoDB URI
  if (app.get('config').db_uri && (app.get('config').db_uri.length > 10)) {
    if (app.get('config').db_uri.split("//")[0] == "mongodb:") {
      Fluff.log.info("DB URI looks ok.");
      connectDb(function () {
        checkDb(function () {
          loadConfig(function () {
            initPlugins(function () {
              loadModels(function () {
                applyConfig(Callback);
              });
            });
          });
        });
      });
    }
    else {
      Fluff.log.info("DB URI is not working.");
      runAlertMode('bad_db_uri');
    }
  }
  else {
    Fluff.log.info("DB URI looks not set.");
    runAlertMode('no_db_uri');
  }
}

// FIXME need to check if plugin configs changed, if so, then reload plugins, then applyconfig
var reloadConfig = function (req, res) {
  loadConfig(applyConfig);
}

// This is a simple JSON response
// Note the following common HTTP codes
// 200 ok, 400 bad request, 401 unauthorized, 404 not found, 500 server error
Fluff.msgResponse = function (req, res, status, msg) {
  Fluff.log.info(msg);
  res.status(status || 200);
  res.json({msg: msg});
}
exports.msgResponse = Fluff.msgResponse;

// JSON body, sessions and other setup
var preLaunch = function () {
  app.use(bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: true
  }));
  app.use(multer());
  app.use(bodyParser.json({
    limit: '50mb',
    parameterLimit: 100000
  }));
  app.use(cookieParser('abracadabra'));
  app.use(session({
    secret : "abracadabra",
    maxAge : new Date(Date.now() + (3600000 * 24 * 7)), // 1wk, should move to per user setting
    saveUninitialized : true,
    resave : true
  }));
  app.use(methodOverride());
}

// Start listening
var startListening = function (ok, callback, noop) {
  if (!noop) {
    var time = new Date();
    Server.listen(app.get('config').port, function() {
      // Exporting the server object is useful for testing
      exports.Server = Server;
      Fluff.log.info("Now listening on port " + app.get('config').port + " at " + time + ".");
      if (ok && app.get('config').fluff_path) {
        Fluff.log.info("Admin is located at " + app.get('config').fluff_path + "/admin.");
        Fluff.log.info("Public files are located at " + app.get('config').fluff_path + "/js,css,images,fonts,files.");
        Fluff.log.info("Fluff is up.");
      }
      else {
        Fluff.log.info("Fluff is in alert mode.");
      }
      if (callback) {
        Fluff.log.info("Post launch callback starting...");
        callback();
      }
      else {
        Fluff.log.info("No post launch callback.");
      }
    });
  }
}

// This is the red button
var launch = function (launchConfig, loglevel, callback) {
  Fluff.log.info("Starting Fluff...");
  if (loglevel) {
    Fluff.log.transports.console.level = loglevel;
  }
  // This callback is a global, and it is run at the end of startUp.
  Callback = callback;
  preLaunch();
  startUp(launchConfig);
}
exports.launch = launch;
