
// AWS PLUGIN

// All plugins must have a "plug.js" file which exports an "init" and a "load" function with a callback as the first argument

// Pretty standard requirements assuming you need additional model(s) for the plugin.
var app         = require('../../app'),
    Fluff       = app.Fluff,
    mongoose    = require('mongoose'),
    config      = require('./config').config,
    watchlist   = require('./watchlist'),
    nowplaying  = require('./nowplaying'),
    aivSeries   = require('./aiv-series');

// This is a required function that must be exported.
// This will run when you startup Fluff, but will not run when Fluff config is reloaded.
exports.init = function (callback) {

  // If you see this on Fluff startup, then your plugin was detected.
	console.log("I'm the AWS plugin.");

  // These are for AWS credentials
  Fluff.awsAccessKeyId     = config.id;
  Fluff.awsSecretAccessKey = config.key;
  Fluff.awsAssociatesId    = config.assocId;

  // Pulls in the schema definitions from each model file that needs db storage.
  exports.NowPlaying = mongoose.model('NowPlaying', app.toSchema(nowplaying.schema));
  Fluff.match_fields.NowPlaying = nowplaying.match_fields;
  exports.Watchlist  = mongoose.model('Watchlist', app.toSchema(watchlist.schema));
  Fluff.match_fields.Watchlist  = watchlist.match_fields;

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
  Fluff.app.get    (base + '/watchlist',          watchlist.find);
  Fluff.app.get    (base + '/watchlist/info',     watchlist.getinfo);
  Fluff.app.get    (base + '/watchlist/:id',      watchlist.findone);
  Fluff.app.post   (base + '/watchlist',          watchlist.create);
  Fluff.app.delete (base + '/watchlist/:id',      watchlist.remove);
  Fluff.app.get    (base + '/nowplaying',         nowplaying.find);
  Fluff.app.get    (base + '/nowplaying/info',    nowplaying.getinfo);
  Fluff.app.post   (base + '/nowplaying/refresh', nowplaying.refresh);
  Fluff.app.get    (base + '/aiv-series',         aivSeries.findbykeyword);
  Fluff.app.get    (base + '/aiv-series/info',    aivSeries.getinfo);
  
	if (callback) {
		callback();
	}
};
