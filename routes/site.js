
// SITE RESOURCE HANDLER

var app   = require('../app'),
    Fluff = app.Fluff;

// These are for reference, but not used yet
var app_services  = [ "Custom", "Heroku", "AppFog", "OpsWorks" ];
var db_services   = [ "MongoDB", "MongoLab" ];

var schema = '{ \n\
  name           : String, \n\
  domain_name    : String, \n\
  port           : { type: Number,  default: 80 }, \n\
  ssl            : { type: Boolean, default: false }, \n\
  fluff_path     : { type: String,  default: "/fluff", required: true }, \n\
  cors : { \n\
    restricted   : { type: Boolean, default: false }, \n\
    whitelist    : [ String ] \n\
  }, \n\
  captcha : {  \n\
    required              : { type: Boolean, default: false }, \n\
    recaptcha_private_key : String, \n\
    recaptcha_public_key  : String \n\
  }, \n\
  email_from     : String, \n\
  smtp : { \n\
    service      : { \n\
      type: String, \n\
      enum: [ "SMTP", "Gmail", "DynectEmail", "Gmail", "hot.ee", "Hotmail", "iCloud", "mail.ee", "Mail.Ru", "Mailgun", "Mailjet", "Mandrill", "Postmark", "QQ", "SendGrid", "SES", "Yahoo", "yandex", "Zoho" ], \n\
      default: "SMTP" \n\
    }, \n\
    host         : String, \n\
    ssl          : { type: Boolean, default: true }, \n\
    port         : { type: Number,  default: 25 }, \n\
    username     : String, \n\
    password     : String, \n\
  }, \n\
  apikey : { \n\
    required     : { type: Boolean, default: false }, \n\
    keychain     : [ String ] \n\
  }, \n\
  notifications  : { \n\
    type : [{ \n\
      name       : { type: String, required: true }, \n\
      slug       : { type: String, enum: ["signup", "pwchange", "welcome"], required: true, unique: true }, \n\
      subject    : String, \n\
      body       : String \n\
    }], \n\
    default : [ \n\
      { name     : "Sign Up", \n\
        slug     : "signup", \n\
        subject  : "Verify Your Email Address", \n\
        body     : "Hi {{shortname}}\\n\\n" \n\
                 + "In order to complete the signup process, please go to:\\n\\n" \n\
                 + "{{link}}\\n\\n" \n\
                 + "to verify your email address.\\n" \n\
      }, \n\
      { name     : "Change Password", \n\
        slug     : "pwchange", \n\
        subject  : "Reset Request", \n\
        body     : "Hi {{shortname}}\\n\\n" \n\
                 + "We just received a request to reset your password. In order to do so, please go to:\\n\\n" \n\
                 + "{{link}}\\n" \n\
      }, \n\
      { name     : "Welcome", \n\
        slug     : "welcome", \n\
        subject  : "Your Account is Ready", \n\
        body     : "Hi {{shortname}}\\n\\n" \n\
                 + "We just setup a new user account for you. In order to complete the setup process, please go to:\\n\\n" \n\
                 + "{{link}}\\n\\n" \n\
                 + "to set your password.\\n" \n\
      } \n\
    ] \n\
  }, \n\
  plugins : { \n\
    type : [{ \n\
      name        : { type: String, required: true }, \n\
      slug        : { type: String, required: true, unique: true }, \n\
      description : String, \n\
      author      : String, \n\
      license     : String, \n\
      version     : String, \n\
      date        : Date, \n\
      config      : { \n\
        type : [{ \n\
          name  : String, \n\
          value : String \n\
        }] \n\
      } \n\
    }] \n\
  }, \n\
  creator_id     : ObjectId, \n\
  lastupdater_id : ObjectId, \n\
  creation       : { type: Date, default: Date.now }, \n\
  lastupdate     : { type: Date, default: Date.now } \n\
}';
exports.schema = schema;

var display_columns = [{
  name:  'name',
  title: 'Site Name',
  size:  20
},
{
  name:  'domain_name',
  title: 'Domain',
  size:  20
},
{
  name:  'fluff_path',
  title: 'Fluff Path',
  size:  20
}];

var sort_column = { name:'name', order:true };

// Searchable fields
var match_fields = ['name', 'domain_name'];
exports.match_fields = match_fields;

// Preprocessor for GET /site/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admin', app.Site, function(){
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column,
      match_fields    : match_fields
    }
    res.json(data);
  });
};

// Handler for GET
exports.findone = function(req, res, resource, filter, callback){
  resource.findOne().exec(function (err, site) {
    if (err) { 
      Fluff.msgResponse(req, res, 500, JSON.stringify(err));
    }
    else {
      if (site) {
        if (site.domain && !site.domain_name) {
          site.domain_name = site.domain;
        }
        res.json(site);
        if (callback) {
          callback(req, res, site);
        }
      }
      else {
        Fluff.msgResponse(req, res, 404, 'No site found.');
      }
    }
  });
};

// Handler for PUT
exports.update = function(req, res, resource, filter, callback){
  // Merge any missing data
  var merge = require('merge');
  var config = Fluff.app.get('config');
  var update = merge(true, config, req.body);
  // Make sure the plugin info is included
  update.plugins.forEach(function (plugin, index) {
    update.plugins[index] = {
      name:        config.plugins[index].name,
      slug:        config.plugins[index].slug,
      description: config.plugins[index].description,
      author:      config.plugins[index].author,
      license:     config.plugins[index].license,
      version:     config.plugins[index].version,
      date:        config.plugins[index].date,
      disabled:    plugin.disabled,
      config:      plugin.config
    };
  });
  // Make sure the updater info is correct
  update.lastupdate     = new Date;
  update.lastupdater_id = req.session.user.id;
  // Make sure the update data has not id
  if (update.id)  { delete update.id; }
  if (update._id) { delete update._id; }
  Fluff.log.info("Going to update site with this object:");
  Fluff.log.info(JSON.stringify(update));
  resource.findOneAndUpdate(null, update, null, function (err, site) {
    if (err) { 
      Fluff.msgResponse(req, res, 500, "Problem trying to save site data:" + JSON.stringify(err));
    }
    else { 
      if (site) {
        Fluff.log.info("UPDATE ITEM:\n" + JSON.stringify(site));
        res.json(site);
      }
      else {
        Fluff.msgResponse(req, res, 404, "Nothing to update.");
      }
    }
    if (!err && callback) {
      callback(req, res, site);
    }
  });
};
