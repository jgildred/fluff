
// BANTR PLUGIN

// All plugins must have a "plug.js" file which exports an "init" and a "load" function with a callback as the first argument

// Pretty standard requirements assuming you need additional model(s) for the plugin.
var Fluff      = require('../../app').Fluff,
    mongoose   = require('mongoose'),
    schemas    = require('./schemas'),
    utterances = require('./utterances'),
    rules      = require('./rules');

var iSpeechKey = "8ae68fc6dfdd29852cf7424f9c00ce8b";
exports.iSpeechKey = iSpeechKey;

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	console.log("I'm the Bantr plugin.");

  // Pulls in the schema definitions from "schemas.js".
	var utteranceSchema = new mongoose.Schema(schemas.utterance);
  exports.Utterance   = mongoose.model('Utterance', utteranceSchema);
  var ruleSchema = new mongoose.Schema(schemas.rule);
  exports.Rule   = mongoose.model('Rule', ruleSchema);

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
  Fluff.app.get (base + '/utterances',         utterances.find);
  Fluff.app.get (base + '/utterances/:id',     utterances.findone);
  Fluff.app.post(base + '/utterances',         utterances.create);
  Fluff.app.put (base + '/utterances/:id',     utterances.update);
  Fluff.app.del (base + '/utterances/:id',     utterances.remove);

  Fluff.app.get (base + '/rules',         rules.find);
  Fluff.app.get (base + '/rules/:id',     rules.findone);
  Fluff.app.post(base + '/rules',         rules.create);
  Fluff.app.put (base + '/rules/:id',     rules.update);
  Fluff.app.del (base + '/rules/:id',     rules.remove);

	if (callback) {
		callback();
	}
};
