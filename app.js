
// MAIN APP

// Dependencies
var express    = require('express')
  , mongoose   = require('mongoose')
  , static     = require('node-static')
  , nodemailer = require('nodemailer')
  , defaults   = require('./defaults')
  , schemas    = require('./schemas')
  , csrf       = require('./csrf')
  , users      = require('./routes/users')
  , resource   = require('./routes/default')
  , auth       = require('./routes/auth');

// Create the app
var app = express();
exports.App = app;

var handleError = function(err) {
  console.log("Bad things happened: " + err);
}

// Load the default config
var loadDefaults = function () {
  var active_config = defaults.Config;
  // if on Heroku then fix config
  if (active_config.app_service == "Heroku") {
    if ((active_config.db.service == "MongoLab") && process.env.MONGOLAB_URI) {
      active_config.db.uri = process.env.MONGOLAB_URI;
    }
    if (process.env.PORT) {
      active_config.port = process.env.PORT;
    }
  }
  app.set('config', active_config);
}

// Setup globals
var Site, User, View, Page, Var;

// Setup DB connection
var connectDb = function (req, res, callback) {
  console.log("connecting to " + app.get('config').db.uri);
  mongoose.connect(app.get('config').db.uri);

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
    console.log("PW: " + password);
    console.log("SALT: " + this.salt);
    console.log("CHECKING: HASH " + hash + " WITH PWHASH " + this.pwhash);
    return (this.pwhash == hash) ?
      true : false;
  }
  User   = mongoose.model('User', userSchema);
  exports.User = User;

  var siteSchema = new mongoose.Schema(schemas.site);
  Site   = mongoose.model('Site', siteSchema);

  var viewSchema = new mongoose.Schema(schemas.view);
  View   = mongoose.model('View', viewSchema);

  var pageSchema = new mongoose.Schema(schemas.page);
  Page   = mongoose.model('Page', pageSchema);

  var varSchema  = new mongoose.Schema(schemas.var);
  Var    = mongoose.model('Var', varSchema);

  if (callback) {
    callback(req, res);
  }
}

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

var HasAccess = function(req, res, level, resourceScope){
  if (req.session.auth && (req.session.status == 'Active')) {
    switch (level) {
    case 'Users':
      console.log("resource is: " + (resourceScope ? resourceScope.modelName : 'none'));
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
      if ((req.session.role) && (req.session.role == 'Admin')) {
        return true;
      }
      else {
        msgResponse(req, res, 403, "You must be admin.");
        return false;
      }
      break;
    default:
      return false;
    }
  }
  else {
    return false;
  }
};
exports.HasAccess = HasAccess;

// Render vars in a page's content
var renderVars = function (req, res, template, callback) {
  var var_tag = "var"; // this may move to a site config
  var output = template;
  Var.find().exec(function (err, vars) {
    if (!err && vars) {
      vars.forEach(function (vari) {
        var pattern = new RegExp("{{\\s*" + var_tag + "\\." + vari.name + "\\s*}}", "gi");
        output = output.replace(pattern, vari.value);
      });
    }
    if (callback) {
      renderSiteInfo(req, res, output, callback);
    }
    else {
      renderSiteInfo(req, res, output);
    } 
  });
}

// Render site info in a page's content
var renderSiteInfo = function (req, res, template, callback) {
  var site_tag = "site"; // this may move to a site config
  var output = template;
  var siteInfo = [
    { tag: 'name',       value: app.get('config').name },
    { tag: 'url',        value: (app.get('config').ssl ? 'https://' : 'http://') + app.get('config').domain + ((!app.get('config').ssl && (app.get('config').port != 80)) ? app.get('config').port : '') },
    { tag: 'domain',     value: app.get('config').domain },
    { tag: 'protocol',   value: (app.get('config').ssl ? 'https://' : 'http://') },
    { tag: 'admin_path', value: app.get('config').admin_path }
  ];
  siteInfo.forEach(function (infoItem) {
    var pattern = new RegExp("{{\\s*" + site_tag + "\\." + infoItem.tag + "\\s*}}", "gi");
    output = output.replace(pattern, infoItem.value);
  });
  if (callback) {
    callback(req, res, output);
  }
}

// Render the view with the page
var renderView = function (req, res, page, callback) {
  var template = '';
  View.findById(page.view_id).exec(function (err, data) {
    if (!err && data) {
      var content_tag = "content"; // this may move to a site config
      template = data.template;
      var pattern = new RegExp("{{\\s*" + content_tag + "\\s*}}", "i");
      template = template.replace(pattern, page.content);
      if (callback) {
        renderVars(req, res, template, callback);
      }
      else {
        renderVars(req, res, template);
      }
    }
    else {
      next();
    }
  });
}

// Setup cms route based upon page in db with matching path
var cmsPages = function (req, res, next) {
  console.log("starting cmsPages");
  var url = req.originalUrl;
  if (url != "/favicon.ico") {
    Page.findOne({"path": url}).exec(function (err, data) {
      if (!err && data) { 
        console.log("matched a cmsPage");
        if (data.get('status') == "Published") {
          if (data.get('access') == "Public") {
            renderView(req, res, data, renderOutput);
          }
          else {
            console.log("access by " + data.get('access'));
            if (HasAccess(req, res, data.get('access'), Page)) {
              renderView(req, res, data, renderOutput);
            }
            else {
              next();
            }
          }
        }
        else {
          console.log("cmsPage unpublished");
          res.status = 404;
          res.send("The page you requested does not exist.");
        }
      }
      else {
        res.status = 404;
        res.send("The page you requested does not exist.");
      }
    });
  }
  else {
    next();
  }
}

var renderOutput = function (req, res, output) {
  res.send(output);
}

var initDb = function (req, res, callback) {
  var crypto = require('crypto')
    , seed   = require('./seed');
  // make sure that there is not existing db data (check for site)
  Site.count().exec(function (err, count) {
    if (!err && (count == 0)) { 

      console.log("No site in the db yet.");
      Site.create(defaults.Config, function (err) {
        if (err) return handleError(err);

        seed.Data.users.forEach(function(user) { 
          user.salt        = users.randomString();
          user.pwhash      = users.saltyHash(user.password, user.salt);
          user.verifytoken = users.makeToken();
        });
        User.create(seed.Data.users, function (err) {
          if (err) return handleError(err);

          View.create(seed.Data.views, function (err, view) {
            if (err) return handleError(err);

            console.log("created page for view " + view._id);
            seed.Data.pages.forEach(function(page) { 
              page.view_id = view._id;
            });
            Page.create(seed.Data.pages, function (err) {
              if (err) return handleError(err);
              
              Var.create(seed.Data.vars, function (err) {
                if (err) return handleError(err);

                console.log("initialized DB with seed data");
                if (callback) {
                  callback(req, res);
                }
                else {
                  applyConfig(req, res);
                }
              });
            });
          });
        });
      });
    }
    else {
      if (count > 0) {
        console.log(count + " site(s) in the DB already.");
      }
      else {
        console.log("DB init error.");
      }
      console.log("Wipe DB and restart app, or set 'initialize' to false in defaults.js.");
    }
  });
}

var mergeConfig = function (active_config, stored_config) {
  console.log("active config: " + JSON.stringify(active_config));
  console.log("stored config: " + JSON.stringify(stored_config));
  for (item in stored_config) {
    if ((Object.prototype.toString.call(stored_config[item]) === '[object Object]') && (Object.keys(stored_config[item]).length > 0)) {
      if (!active_config.hasOwnProperty(item)){
        active_config[item] = {};
      }
      for (sub_item in stored_config[item]) {
        active_config[item][sub_item] = stored_config[item][sub_item];
      }
    }
    else {
      active_config[item] = stored_config[item];
    }
  }
  return active_config;
}

// Load the site config from the db
var loadConfig = function (req, res, callback) {
  console.log("load config");
  Site.findOne().exec(function (err, data) {
    if (!err && data) {
      var active_config = app.get('config');
      var stored_config = data.toJSON();
      active_config = mergeConfig(active_config, stored_config);
      // if on Heroku then make sure server port uses the Heroku env
      if (process.env.PORT) {
        active_config.port = process.env.PORT;
      }      
      app.set('config', active_config);
      console.log("loaded config: " + JSON.stringify(active_config));
    }
    else {
      console.log("config load errer: " + err);
    }
    if (callback) {
      callback(req, res);
    }
    else {
      applyConfig(req, res);
    }
  });
}

// Create the mailer
var setupMailer = function (req, res, next) {
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
    mailerData.service          = app.get('config').smtp.service;
  }
  //console.log("mailer data: " + JSON.stringify(mailerData));
  exports.mailer = nodemailer.createTransport("SMTP", mailerData);
  next();
}

var requireApiKey = function(req, res, next) {
  if (/\/api\//i.test(req.path) && app.get('config').apikey.required) {
    var apikeys = app.get('config').apikey.keychain;
    console.log("API keys are " + apikey.keychain);
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

var applyConfig = function(req, res, next) {
  
  // Site url is useful for email notification which link back to the site
  var protocol    = app.get('config').ssl  ? "https://" : "http://";
  var port        = app.get('config').port ? ":" + app.get('config').port : "";
  exports.siteUrl = protocol + app.get('config').domain + port;

  // Run all the setup routines with the latest config
  app.use(setupMailer);
  app.use(allowCrossDomain);
  app.use(requireApiKey);
  app.use(csrf.check);
  app.use(app.router);
  app.use(app.get('config').admin_path, express.static(__dirname + '/admin'));
  app.use(cmsPages);

  // Setup routes using the default resource handler
  var base = app.get('config').admin_path + '/api';
  app.get (base + '/auth',     auth.check);
  app.get (base + '/auth/:id', auth.check);
  app.post(base + '/auth',     auth.attach);
  app.put (base + '/auth/:id', auth.attach);
  app.del (base + '/auth/:id', auth.detach);

  app.get (base + '/users',           users.find);
  app.get (base + '/users/:id',       users.findone);
  app.post(base + '/users',           users.create);
  app.put (base + '/users/:id',       users.update);
  app.put (base + '/verify/:token',   users.verify);
  app.put (base + '/pwreset/:email',  users.pwreset);
  app.put (base + '/pwchange/:token', users.pwchange);
  app.del (base + '/users/:id',       users.remove);

  app.get (base + '/sites',     function(req, res) {resource.find   (req, res, Site);} );
  app.get (base + '/sites/:id', function(req, res) {resource.findone(req, res, Site);} );
  //app.post(base + '/sites',     function(req, res) {resource.create (req, res, Site, reloadConfig);} );
  app.put (base + '/sites/:id', function(req, res) {resource.update (req, res, Site, null, reloadConfig);} );
  //app.del (base + '/sites/:id', function(req, res) {resource.remove (req, res, Site);} );

  app.get (base + '/pages',     function(req, res) {resource.find   (req, res, Page);} );
  app.get (base + '/pages/:id', function(req, res) {resource.findone(req, res, Page);} );
  app.post(base + '/pages',     function(req, res) {resource.create (req, res, Page);} );
  app.put (base + '/pages/:id', function(req, res) {resource.update (req, res, Page);} );
  app.del (base + '/pages/:id', function(req, res) {resource.remove (req, res, Page);} );

  app.get (base + '/views',     function(req, res) {resource.find   (req, res, View);} );
  app.get (base + '/views/:id', function(req, res) {resource.findone(req, res, View);} );
  app.post(base + '/views',     function(req, res) {resource.create (req, res, View);} );
  app.put (base + '/views/:id', function(req, res) {resource.update (req, res, View);} );
  app.del (base + '/views/:id', function(req, res) {removeIfNotLast (req, res, View);} );

  app.get (base + '/vars',      function(req, res) {resource.find   (req, res, Var);} );
  app.get (base + '/vars/:id',  function(req, res) {resource.findone(req, res, Var);} );
  app.post(base + '/vars',      function(req, res) {resource.create (req, res, Var);} );
  app.put (base + '/vars/:id',  function(req, res) {resource.update (req, res, Var);} );
  app.del (base + '/vars/:id',  function(req, res) {resource.remove (req, res, Var);} );
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

var startupConfig = function (req, res) {
  console.log("startup config");
  if (app.get('config').initialize) {
    console.log("initialize DB");
    // initialize db with seed data (site, admin, example page/view/vars)
    connectDb(req, res, initDb);
  }
  else {
    connectDb(req, res, loadConfig);
  }
}

var reloadConfig = function (req, res) {
  console.log("reload config");
  loadConfig(req, res);
}

var msgResponse = function (req, res, status, msg) {
  console.log(msg);
  res.status(status || 200);
  res.json({msg: msg});
}
exports.msgResponse = msgResponse;

// JSON body, sessions and other setup
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret : "abracadabra",
  maxAge : new Date(Date.now() + 3600000) // 1 Hour; should move to per user setting
}));
app.use(express.methodOverride());
loadDefaults();
startupConfig();

// Start listening
console.log("listening on port " + app.get('config').port);
console.log("admin located at " + app.get('config').admin_path);
app.listen(app.get('config').port);

