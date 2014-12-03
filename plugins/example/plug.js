
// PLUGIN EXAMPLE

// All plugins must have a "plug.js" file which exports an "init" and a "load" function with a callback as the first argument

// Pretty standard requirements assuming you need additional model(s) for the plugin.
// In this example you use the plugthings.js model file for it's schema and routes.
var app        = require('../../app'),
    Fluff      = app.Fluff,
    mongoose   = require('mongoose'),
    plugthings = require('./plugthings');

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	Fluff.log.info("I'm the example plugin.");

  // Pulls in the schema definitions from plugthings.js.
  exports.Plugthing = mongoose.model('Plugthing', app.toSchema(plugthings.schema));
  Fluff.match_fields.Plugthing = plugthings.match_fields;

  if (callback) {
    callback();
  }
};

// This is a required function that must be exported.
// This will run when you startup Fluff (after init), and anytime Fluff config is reloaded.
exports.load = function (callback) {

	// This is the prefix for your routes.
  var base = Fluff.app.get('config').fluff_path + '/admin/api';

  // Any routes added by the plugin, including routes for your plugin's model(s).
  Fluff.app.get   (base + '/plugthings',         plugthings.find);
  Fluff.app.get   (base + '/plugthings/:id',     plugthings.findone);
  Fluff.app.post  (base + '/plugthings',         plugthings.create);
  Fluff.app.put   (base + '/plugthings/:id',     plugthings.update);
  Fluff.app.patch (base + '/plugthings/:id',     plugthings.update);
  Fluff.app.delete   (base + '/plugthings/:id',     plugthings.remove);

	if (callback) {
		callback();
	}
};
