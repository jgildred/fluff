
// MAIN APP

// Dependencies
var express    = require('express')
  , mongoose   = require('mongoose')
  , nodemailer = require('nodemailer')
  , config     = require('./config')
  , schemas    = require('./schemas')
  , csrf       = require('./csrf')
  , users      = require('./routes/users')
  , resource   = require('./routes/resource')
  , auth       = require('./routes/auth');

// Create the app
var app = express();
exports.App = app;

var handleError = function(err) {
  console.log("Bad things happened: " + err);
}

// Load the default config
var loadDefaults = function () {
  var default_config = {
    initialize  : false,
    app_service : 'Custom',
    db : {
      service   : 'MongoDB',
      uri       : 'mongodb://localhost:27017/fluff'
    }
  }
  var active_config = (config && config.Info) ? config.Info : defalut_config;
  // if on Heroku or AppFog then fix config
  switch (active_config.app_service) {
    case "Heroku":
      if ((active_config.db.service == "MongoLab") && process.env.MONGOLAB_URI) {
        active_config.db.uri = process.env.MONGOLAB_URI;
      }
      if (process.env.PORT) {
        active_config.port = process.env.PORT;
      }
      break;
    case "AppFog":
      if ((active_config.db.service == "MongoDB") && process.env.VCAP_SERVICES) {
        var env   = JSON.parse(process.env.VCAP_SERVICES);
        var obj   = env['mongodb-1.8'][0]['credentials'];
        var cred  = '';
        if (obj.username && obj.password) {
          cred = obj.username + ":" + obj.password + "@";
        }
        var dburi = "mongodb://" + cred + obj.hostname + ":" + obj.port + "/" + obj.db;
        active_config.db.uri = dburi;
      }
      if (process.env.VMC_APP_PORT) {
        active_config.port = process.env.VMC_APP_PORT;
      }
      break;
    default:
      active_config.port = 3000;
  }
  app.set('config', active_config);
}

// Setup globals
var Site, User, View, Page, Var; 

// Setup DB connection
var connectDb = function (req, res, callback) {
  console.log("Connecting to " + app.get('config').db.uri);
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

var doIfHasAccess = function (req, res, level, resourceScope, callback) {
  if (HasAccess(req, res, level, resourceScope)) {
    if ((callback == resource.update) && (resourceScope == Site)) {
      callback(req, res, resourceScope, null, reloadConfig);
    }
    else {
      callback(req, res, resourceScope);
    }
  }
}

var HasAccess = function(req, res, level, resourceScope){
  if (req.session.auth && (req.session.status == 'Active')) {
    switch (level) {
    case 'Users':
      console.log("The requested resource is: " + (resourceScope ? resourceScope.modelName : 'none'));
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
    msgResponse(req, res, 403, "You must be logged in.");
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
      res.header('Content-Type', data.content_type ? data.content_type : 'text/html');
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
  var url = req.originalUrl;
  if (url != "/favicon.ico") {
    console.log("Looking up pages...");
    Page.findOne({"path": url}).exec(function (err, data) {
      if (!err && data) { 
        console.log("Matched a page path.");
        if (data.get('status') == "Published") {
          if (data.get('access') == "Public") {
            renderView(req, res, data, renderOutput);
          }
          else {
            console.log("Access requested by " + data.get('access'));
            if (HasAccess(req, res, data.get('access'), Page)) {
              renderView(req, res, data, renderOutput);
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
        res.status = 404;
        res.send("The page you requested does not exist.");
      }
    });
  }
  else {
    console.log("Favicon requested.");
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
          console.log("Creating a user...");
          if (err) return handleError(err);

          seed.Data.views.forEach(function (view) {
            view.creator_id     = firstuser._id;
            view.lastupdater_id = firstuser._id;
          });
          View.create(seed.Data.views, function (err, view) {
            console.log("Creating a view...");
            if (err) return handleError(err);
            
            seed.Data.pages.forEach(function (page) {
              page.view_id        = view._id;
              page.creator_id     = firstuser._id;
              page.lastupdater_id = firstuser._id;
            });
            Page.create(seed.Data.pages, function (err) {
              console.log("Creating a page...");
              if (err) return handleError(err);
              
              seed.Data.vars.forEach(function (vari) {
                vari.creator_id     = firstuser._id;
                vari.lastupdater_id = firstuser._id;
              });
              Var.create(seed.Data.vars, function (err) {
                console.log("Creating a var...");
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
    }
    else {
      if (count > 0) {
        console.log(count + " site(s) in the DB already.");
      }
      else {
        console.log("DB init error: " + err);
      }
      console.log("Wipe DB and restart Fluff, or set 'initialize' to false in config.js.");
      runAlertMode(req, res, null, "Not feeling fluffy.<br/>Fluff DB already initialized.");
    }
  });
}

var mergeConfig = function (active_config, stored_config) {
  console.log("App config: "  + JSON.stringify(active_config));
  console.log("Site config: " + JSON.stringify(stored_config));
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
      // don't merge in the port unless custom app_service
      if (item != 'port') {
        active_config[item] = stored_config[item];
      }
      else {
        if (active_config.app_service == "Custom") {
          active_config[item] = stored_config[item];
        }
      }
    }
  }
  return active_config;
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
      runAlertMode(req, res, null, "Not feeling fluffy.<br/>Fluff DB is not initialized.");
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
      html += "<p><img src='/images/sad_fluffy.png' /></p>\n";
      html += "<p>" + message + "</p>\n";
      html += "</body>\n";
      html += "</html>";
      return html;
}

var runAlertMode = function(req, res, next, text) {
  app.use ('/images', express.static(__dirname + '/images'));
  app.all ('*', function(req, res) {
    res.status=500; 
    res.send(defaultAlertPage(text));
  });
  startListening(req, res, false);
}

var applyConfig = function(req, res, next) {
  
  // Site url is useful for email notification which link back to the site
  var protocol    = app.get('config').ssl  ? "https://" : "http://";
  var port        = app.get('config').port ? ":" + app.get('config').port : "";
  var siteUrl = protocol + app.get('config').domain;
  // Heroku and other paas will not expose the internal server port
  if (app.get('config').app_service != "Custom") {
    siteUrl += port;
  }
  exports.siteUrl = siteUrl;

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

  app.get (base + '/sites',     function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.find);} );
  app.get (base + '/sites/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.findone);} );
  //app.post(base + '/sites',     function(req, res) {resource.create (req, res, Site, reloadConfig);} );
  app.put (base + '/sites/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Site, resource.update);} );
  //app.del (base + '/sites/:id', function(req, res) {resource.remove (req, res, Site);} );

  app.get (base + '/pages',     function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.find);} );
  app.get (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.findone);} );
  app.post(base + '/pages',     function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.create);} );
  app.put (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.update);} );
  app.del (base + '/pages/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', Page, resource.remove);} );

  app.get (base + '/views',     function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.find);} );
  app.get (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.findone);} );
  app.post(base + '/views',     function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.create);} );
  app.put (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, resource.update);} );
  app.del (base + '/views/:id', function(req, res) {doIfHasAccess(req, res, 'Admins', View, removeIfNotLast);} );

  app.get (base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.find);} );
  app.get (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.findone);} );
  app.post(base + '/vars',      function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.create);} );
  app.put (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.update);} );
  app.del (base + '/vars/:id',  function(req, res) {doIfHasAccess(req, res, 'Admins', Var, resource.remove);} );
  app.all (base + '/*', function(req, res) {res.status=404; res.json({msg:"The requested resource does not exist."});} );

  startListening(req, res, true);
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
  console.log("Starting Fluff...");
  if (app.get('config').initialize) {
    console.log("Initialize DB...");
    // initialize db with seed data (site, admin, example page/view/vars)
    connectDb(req, res, initDb);
  }
  else {
    connectDb(req, res, loadConfig);
  }
}

var reloadConfig = function (req, res) {
  console.log("Reloading config from DB...");
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
var startListening = function (req, res, ok) {
  app.listen(app.get('config').port);
  console.log("Listening on port " + app.get('config').port + ".");
  if (ok && app.get('config').admin_path) {
    console.log("Admin is located at " + app.get('config').admin_path + ".");
    console.log("Fluff is up.");
  }
  else {
    console.log("Fluff is in alert mode.");
  }
}