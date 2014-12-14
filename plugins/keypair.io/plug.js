
// PLUGIN FOR Keypair.io

var Fluff      = require('../../app').Fluff,
    schemas    = require('./schemas'),
    identities = require('./identities'),
    mongoose   = require('mongoose');

exports.init = function (callback) {
	console.log("I'm the Keypair.io plugin.");

	var identitySchema = new mongoose.Schema(schemas.identity);
  exports.Identity   = mongoose.model('Identity', identitySchema);

	var certificateSchema = new mongoose.Schema(schemas.certificate);
  exports.Certificate   = mongoose.model('Certificate', certificateSchema);

  if (callback) {
    callback();
  }
};

exports.load = function (callback) {
	// Setup routes using the default resource handler
  var base = Fluff.app.get('config').fluff_path + '/admin/api';

  // Identity routes
  Fluff.app.get (base + '/identities',         identities.find);
  Fluff.app.get (base + '/identities/:id',     identities.findone);
  Fluff.app.get (base + '/identities/:id/pem', identities.findone);
  Fluff.app.get (base + '/identities/:id/csr', identities.findone);
  Fluff.app.get (base + '/identities/:id/crl', identities.findone);
  Fluff.app.post(base + '/identities',         identities.create); //missing private_key and public_key will cause keygen
  Fluff.app.post(base + '/identities/import',  identities.import);
  Fluff.app.put (base + '/identities/:id',     identities.update);
  Fluff.app.delete (base + '/identities/:id',     identities.remove);

  // Certificate routes
  // TBD

	if (callback) {
		callback();
	}
};
