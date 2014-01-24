
// MONGOOSE SCHEMAS FOR BANTR PLUGIN

var mongoose = require('mongoose');

exports.utterance = {
  user_id        : mongoose.Schema.Types.ObjectId,    // This is used to identify the owner.
  text           : { type: String, required: true},   // Text representation of utterance.
  audio_file     : String,                            // Audio of utterance, not used yet.
  creator_id     : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  lastupdater_id : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  creation       : { type: Date, default: Date.now }, // Fluff wants these fields for accounting.
  lastupdate     : { type: Date, default: Date.now }  // Fluff wants these fields for accounting.
};

exports.rule = {
  user_id        : mongoose.Schema.Types.ObjectId,    // This is used to restrict a rule to a particular user.
  utterance_id   : mongoose.Schema.Types.ObjectId,    // The utterance that caused the last update.
  condition      : { type: String, required: true},   // Condition where rule applies.
  response       : { type: String, required: true},   // Text of the response.
  creator_id     : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  lastupdater_id : mongoose.Schema.Types.ObjectId,    // Fluff wants these fields for accounting.
  creation       : { type: Date, default: Date.now }, // Fluff wants these fields for accounting.
  lastupdate     : { type: Date, default: Date.now }  // Fluff wants these fields for accounting.
};