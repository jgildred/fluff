
// VIEW RESOURCE PREPROCESSOR

var app   = require('../app'),
    Fluff = app.Fluff;

var schema = "{ \n\
  name           : { type: String, unique: true }, \n\
  template       : { type: String, default: '{{content}}' }, \n\
  content_type   : String, \n\
  cursor : { \n\
    row          : { type: Number, default: 0 }, \n\
    column       : { type: Number, default: 0 } \n\
  }, \n\
  creator_id     : ObjectId, \n\
  lastupdater_id : ObjectId, \n\
  creation       : { type: Date, default: Date.now }, \n\
  lastupdate     : { type: Date, default: Date.now } \n\
}";
exports.schema = schema;

var display_columns = [{
  name:  'name',
  title: 'Name',
  size:  20
},
{
  name:  'content_type',
  title: 'Type',
  size:  20
}];

var sort_column = { name:'name', order:true };

// Searchable fields
var match_fields = ['name'];
exports.match_fields = match_fields;

// Preprocessor for GET /views/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', app.View, function(){
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column,
      match_fields    : match_fields
    }
    res.json(data);
  });
};