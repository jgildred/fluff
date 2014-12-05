
// PLUGIN FOR AVB.io

var Fluff      = require('../../app').Fluff,
    mongoose   = require('mongoose'),
    schemas    = require('./schemas'),
    devices    = require('./devices'),
    commands   = require('./commands'),
    heartbeat  = require('./heartbeat');

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	console.log("I'm the AVB.io plugin.");

  // Pulls in the schema definitions from "schemas.js".
	var deviceSchema = new mongoose.Schema(schemas.device);
  exports.Device   = mongoose.model('Device', deviceSchema);

  var commandSchema = new mongoose.Schema(schemas.command);
  exports.Command   = mongoose.model('Command', commandSchema);

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
  Fluff.app.get (base + '/devices',           devices.find);
  Fluff.app.get (base + '/users/:id/devices', devices.findbyuser);
  Fluff.app.get (base + '/devices/:id',       devices.findone);
  Fluff.app.post(base + '/devices',           devices.create);
  Fluff.app.post(base + '/link/:uid',         devices.link);
  Fluff.app.put (base + '/devices/:id',       devices.update);
  Fluff.app.delete (base + '/devices/:id',       devices.remove);
  Fluff.app.post(base + '/heartbeat/:uid',    heartbeat.process);

  Fluff.app.get (base + '/commands',             commands.find);
  Fluff.app.get (base + '/devices/:id/commands', commands.findbydevice);
  Fluff.app.get (base + '/users/:id/commands',   commands.findbyuser);
  Fluff.app.get (base + '/commands/:id',         commands.findone);
  Fluff.app.post(base + '/commands',             commands.create);
  Fluff.app.delete (base + '/commands/:id',         commands.remove);

	if (callback) {
		callback();
	}
};
