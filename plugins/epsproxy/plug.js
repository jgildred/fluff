
// EPSPROXY PLUGIN

// All plugins must reside in their own sub-directory under the /plugins directory and have a "plug.js" file which exports an "init" and a "load" function with a callback as the first argument. Note that if your plugin requires special modules, use a package.json file in your plugin's directory to manage the modules specific to your plugin.

// The requirements below are standard, assuming you need additional model(s) for the plugin.
// In this example you use the plugthings.js model file for it's schema and routes.
var app    = require('../../app'),
    Fluff  = app.Fluff,
    tokens = require('./tokens');

// This object is required to be exported, and it must at least contain a name. The slug will be populated automatically using the plugin's directory name (slug will be converted to all lowercase, spaces will be replace with underscores and punctuation removed).
var info = {
  name        : "EPS Proxy Plugin",
  description : "This plugin makes token requests to EPS based on a content ID and authenticator.",
  author      : "John Gildred",
  license     : "MIT License",
  version     : "1.0",        // Use 0.0 or 0.0.0 format for version
  date        : "2014-12-10", // Use this format for date
  disabled    : false         // If missing then Fluff will assume false
};
exports.info = info;

// Fluff can store a set of key/value pairs for each plugin configuration. Export the config's fields names here for Fluff to detect them. Note: contentModel must match the name of a model in the Fluff database, and the model must have content_id, content_key_and content_url fields. rentalPeriod is in seconds.
var config_fields = [ 'testAuthenticator', 'productionAuthenticator', 'contentModel', 'rentalPeriod' ];
exports.config_fields = config_fields;

// This object is required to be exported, and it must start out empty. It will be populated from data in the database at plugin load time.
var config = {};
exports.config = config;

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	Fluff.log.info("I'm the epsproxy plugin.");

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
  
	// This is the prefix for your routes. Use the fluff_path to avoid conflicts.
  var base = Fluff.app.get('config').fluff_path + '/api';

  // Any routes added by the plugin, including routes for your plugin's model(s).
  Fluff.app.get (base + '/token/:env/:type/:content_id', tokens.request);

	if (callback) {
		callback();
	}
};
