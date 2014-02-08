
// MONGOOSE SCHEMAS FOR BANTR PLUGIN

var mongoose = require('mongoose');

exports.utterance_display_columns = [{
  name:  'text',
  title: 'What Was Said',
  size:  20
},
{
  name:  'user_id',
  title: 'User',
  size:  10
},
{
  name:  'lastupdate',
  title: 'Last Updated',
  size:   10
}];
exports.utterance_sort_column = { name:'lastupdate', order:true };
exports.utterance = "{\n\
  user_id        : ObjectId,                          // This is used to identify the owner.\n\
  text           : { type: String, required: true},   // Text representation of utterance.\n\
  audio_file     : String,                            // Audio of utterance, not used yet.\n\
  creator_id     : ObjectId,                          // Fluff wants these fields for accounting.\n\
  lastupdater_id : ObjectId,                          // Fluff wants these fields for accounting.\n\
  creation       : { type: Date, default: Date.now }, // Fluff wants these fields for accounting.\n\
  lastupdate     : { type: Date, default: Date.now }  // Fluff wants these fields for accounting.\n\
}";

exports.rule_display_columns = [{
  name:  'condition',
  title: 'Substring Match',
  size:  20
},
{
  name:  'response',
  title: 'Response',
  size:  20
},
{
  name:  '_id',
  title: 'ID',
  size:   10
},
{
  name:  'lastupdate',
  title: 'Last Updated',
  size:   10
}];
exports.rule_sort_column = { name:'lastupdate', order:true };
exports.rule = "{\n\
  user_id        : ObjectId,                          // This is used to restrict a rule to a particular user.\n\
  utterance_id   : ObjectId,                          // The utterance that caused the last update.\n\
  weight         : Number,                            // Weight for preference\n\
  condition      : { type: String, required: true},   // Condition where rule applies.\n\
  response       : { type: String, required: true},   // Text of the response.\n\
  creator_id     : ObjectId,                          // Fluff wants these fields for accounting.\n\
  lastupdater_id : ObjectId,                          // Fluff wants these fields for accounting.\n\
  creation       : { type: Date, default: Date.now }, // Fluff wants these fields for accounting.\n\
  lastupdate     : { type: Date, default: Date.now }  // Fluff wants these fields for accounting.\n\
}";