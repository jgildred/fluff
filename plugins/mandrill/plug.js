
// MANDRILL PLUGIN

// All plugins must have a "plug.js" file which exports an "init" and a "load" function with a callback as the first argument

// Pretty standard requirements assuming you need additional model(s) for the plugin.
var app         = require('../../app'),
    Fluff       = app.Fluff,
    mandrill    = require('./mandrill');

// This object is required to be exported, and it must at least contain a name. The slug will be populated automatically using the plugin's directory name (slug will be converted to all lowercase, spaces will be replace with underscores and punctuation removed).
var info = {
  name        : "Mandrill Plugin",
  description : "This plugin provides an easy way to send emails through Mandrill.",
  author      : "John Gildred",
  license     : "MIT License",
  version     : "1.0",        // Use 0.0 or 0.0.0 format for version
  date        : "2014-12-10", // Use this format for date
  disabled    : false         // If missing then Fluff will assume false
};
exports.info = info;

// Fluff can store a set of key/value pairs for each plugin configuration. Export the config's fields names here for Fluff to detect them.
var config_fields = [ 'apikey', 'default_template' ];
exports.config_fields = config_fields;

// This object is required to be exported, and it must start out empty. It will be populated from data in the database at plugin load time.
var config = {};
exports.config = config;

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	Fluff.log.info("I'm the Mandrill plugin.");

  if (callback) {
    callback();
  }
};

// This is a required function that must be exported.
// This will run when you startup Fluff (after init), and anytime Fluff config is reloaded.
exports.load = function (callback) {
  
  // Load the plugin config from the site config
  var plugins = Fluff.app.get('config').plugins;
  plugins.forEach(function (plugin) {
    if (plugin.slug == info.slug) {
      config = plugin.config || [];
    }
  });
  exports.config = config;

	// This is the prefix for your routes.
  // Must be '/api', '/admin/api', '/api/*' or '/admin/api/*'
  var base = Fluff.app.get('config').fluff_path + '/api/mandrill';

  // Any routes added by the plugin, including routes for your plugin's model(s).
  Fluff.app.post (base + '/send', mandrill.send);
  
	if (callback) {
		callback();
	}
};
