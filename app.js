
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
    if ((active_config.db_service == "MongoLab") && process.env.MONGOLAB_URI) {
      active_config['db_uri'] = process.env.MONGOLAB_URI;
    }
    if (process.env.PORT) {
      active_config['server_port'] = process.env.PORT;
    }
  }
  app.set('config', active_config);
}

// Setup globals
var Site, User, View, Page, Var;

// Setup DB connection
var connectDb = function (req, res, callback) {
  console.log("connecting to " + app.get('config').db_uri);
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
  if ((app.get('config').cors_mode == 'Allow All') || (app.get('config').cors_whitelist.indexOf(req.headers.origin) != -1)) { 
    res.header('Access-Control-Allow-Credentials', true); 
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS'); 
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'); 
    
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
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

// Render vars in a page's content
var renderVars = function (req, res, template, callback) {
  var output = template;
  Var.find().exec(function (err, data) {
    if (!err && data) {
      for (i = 0; i < data.length; i++) {
        // Try with each case of spaces to be tolerant
        output = output.replace("{{var:"   + data[i].name + "}}",  data[i].value);
        output = output.replace("{{var:"   + data[i].name + " }}", data[i].value);
        output = output.replace("{{var: "  + data[i].name + "}}",  data[i].value);
        output = output.replace("{{var: "  + data[i].name + " }}", data[i].value);
        output = output.replace("{{ var: " + data[i].name + "}}",  data[i].value);
        output = output.replace("{{ var: " + data[i].name + " }}", data[i].value);
      }
      if (callback) {
        callback(req, res, output);
      }
    }
  });
}

// Render the view with the page
var renderView = function (req, res, page, callback) {
  var template = '';
  View.findById(page.view_id).exec(function (err, data) {
    if (!err && data) {
      template = data.template;
      // Try with each case of spaces to be tolerant
      template = template.replace("{{content}}",   page.content);
      template = template.replace("{{content }}",  page.content);
      template = template.replace("{{ content}}",  page.content);
      template = template.replace("{{ content }}", page.content);
      renderVars(req, res, template, callback);
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
        console.log("found a cmsPage");
        renderView(req, res, data, renderOutput);
      }
      else {
        next();
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

  Site.create(defaults.Config, function (err) {
    if (err) return handleError(err);

    var firstUser = true,
        firstView = true,
        firstPage = true,
        firstVar  = true;

    seed.Data.users.forEach(function(user) { 
      user.salt = crypto.randomBytes(Math.ceil(10 * 3 / 4)).toString('base64').slice(0, 10);
      user.pwhash = crypto.createHash('md5').update(user.password + user.salt).digest("hex");
      user.verifytoken = encodeURIComponent(crypto.randomBytes(Math.ceil(10 * 3 / 4)).toString('base64').slice(0, 10));
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

// Load the site config from the db
var loadConfig = function (req, res, callback) {
  console.log("load config");
  Site.findOne().exec(function (err, data) {
    if (!err && data) {
      var active_config = app.get('config');
      var stored_config = data.toJSON();
      for (item in stored_config) {
        active_config[item] = stored_config[item];
      }
      // if on Heroku then make sure server_port correct
      if (process.env.PORT) {
        active_config['server_port'] = process.env.PORT;
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
  exports.mailer = nodemailer.createTransport("SMTP", {
    service: app.get('config').smtp_service,
    auth: {
      user: app.get('config').smtp_username,
      pass: app.get('config').smtp_password
    }
  });
  next();
}

var applyConfig = function(req, res, next) {
  // Run all the setup routines with the latest config
  app.use(setupMailer);
  app.use(allowCrossDomain);
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

  app.get (base + '/users',         users.find);
  app.get (base + '/users/:id',     users.findone);
  app.post(base + '/users',         users.create);
  app.put (base + '/users/:id',     users.update);
  app.put (base + '/verify/:token', users.verify);
  app.del (base + '/users/:id',     users.remove);

  app.get (base + '/sites',     function(req, res) {resource.find   (req, res, Site);} );
  app.get (base + '/sites/:id', function(req, res) {resource.findone(req, res, Site);} );
  app.post(base + '/sites',     function(req, res) {resource.create (req, res, Site, reloadConfig);} );
  app.put (base + '/sites/:id', function(req, res) {resource.update (req, res, Site, null, reloadConfig);} );
  app.del (base + '/sites/:id', function(req, res) {resource.remove (req, res, Site);} );

  app.get (base + '/pages',     function(req, res) {resource.find   (req, res, Page);} );
  app.get (base + '/pages/:id', function(req, res) {resource.findone(req, res, Page);} );
  app.post(base + '/pages',     function(req, res) {resource.create (req, res, Page);} );
  app.put (base + '/pages/:id', function(req, res) {resource.update (req, res, Page);} );
  app.del (base + '/pages/:id', function(req, res) {resource.remove (req, res, Page);} );

  app.get (base + '/views',     function(req, res) {resource.find   (req, res, View);} );
  app.get (base + '/views/:id', function(req, res) {resource.findone(req, res, View);} );
  app.post(base + '/views',     function(req, res) {resource.create (req, res, View);} );
  app.put (base + '/views/:id', function(req, res) {resource.update (req, res, View);} );
  app.del (base + '/views/:id', function(req, res) {resource.remove (req, res, View);} );

  app.get (base + '/vars',      function(req, res) {resource.find   (req, res, Var);} );
  app.get (base + '/vars/:id',  function(req, res) {resource.findone(req, res, Var);} );
  app.post(base + '/vars',      function(req, res) {resource.create (req, res, Var);} );
  app.put (base + '/vars/:id',  function(req, res) {resource.update (req, res, Var);} );
  app.del (base + '/vars/:id',  function(req, res) {resource.remove (req, res, Var);} );
}

var startupConfig = function (req, res) {
  console.log("startup config");
  if (app.get('config').status == "Initialize") {
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
console.log("listening on port " + app.get('config').server_port);
console.log("admin located at " + app.get('config').admin_path);
app.listen(app.get('config').server_port);

