
// MONGOOSE SCHEMAS FOR EXAMPLE PLUGIN

var mongoose = require('mongoose');

exports.plugthing = {
  user_id  : mongoose.Schema.Types.ObjectId, // This is not required but useful if you want to control access to this model based on 'Owner' level.
  name     : String,                         // Also not required but useful.
  creator_id     : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  lastupdater_id : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  creation       : { type: Date, default: Date.now }, // Fluff wants these fields for accounting.
  lastupdate     : { type: Date, default: Date.now }  // Fluff wants these fields for accounting.
};