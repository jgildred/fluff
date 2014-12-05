
// COMMAND RESOURCE PREPROCESSOR

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// Preprocessor for GET /commands
exports.find = function(req, res){
  if (HasAccess(req, res, 'admin')) {
    resource.find(req, res, app.Command);
  }
};

// Preprocessor for GET /devices/:id/commands
// FIXME this is not working correctly
exports.findbydevice = function(req, res){
  HasAccess(req, res, 'deviceowner', resource.find);
};

// Preprocessor for GET /users/:id/commands
// FIXME this is not working correctly
exports.findbyuser = function(req, res){
  if (HasAccess(req, res, 'user')) {
    var filter = {"user_id": req.session.user.id};
    app.Device.find(filter).exec(function (err, data) {
      var array = [];
      for (x=0; x<data.length; x++) {
        array.push(data[x]._id);
      }
      console.log("ARRAY: "+JSON.stringify(array));
      resource.where(req, res, app.Command, 'device_id', array);
    });
  }
};

// Preprocessor for GET /commands/:id
exports.findone = function(req, res){
  HasAccess(req, res, 'owner', resource.findone);
};

// Preprocessor for POST /commands
exports.create = function(req, res){
  if (HasAccess(req, res, 'user')) {
    resource.create(req, res, app.Command);
  }
};

// Preprocessor for DELETE /commands/:id
exports.remove = function(req, res){
  HasAccess(req, res, 'owner', resource.remove);
};

var HasAccess = function(req, res, level, callback){
  if (req.session.auth && (req.session.user.status == 'active')) {
    switch (level) {
      case 'user':
        if (req.session.user.id)
        {
          return true;
        }
        else {
          console.log("MUST BE CORRECT USER OR ADMIN");
          res.json({msg:'Must be correct user or admin.'});
          return false;
        }
        break;
      case 'owner':
        var that = this;
        if (req.session.user.id) {
          app.Command.findOne({"_id": req.params.id}).exec(function(err, command) {
            console.log(JSON.stringify("COMMAND: "+command));
            app.Device.findOne({"_id": command.device_id}).exec(function(err, device) {
              console.log(JSON.stringify("DEVICE: "+device));
              if (device && (device.user_id == req.session.user.id)) {
                console.log("OK!!");
                if (callback) {
                  callback(req, res, app.Command);
                }
              }
              else {
                console.log("MUST BE CORRECT USER OR ADMIN");
                res.json({msg:'Must be correct user or admin.'});
              }
            });
          });
        }
        else {
          res.status(401);
          console.log("MUST BE LOGGED IN");
          res.json({msg:'Must be logged in.'});
        }
        break;
      case 'deviceowner':
        if (req.session.user.id) {
          app.Device.find({"_id": req.params.id, "user_id": req.session.user.id}).exec(function(err, device) {
            if (device && callback) {
              callback(req, res, app.Command);
            }
            else {
              console.log("MUST BE CORRECT USER OR ADMIN");
              res.json({msg:'Must be correct user or admin.'});
            }
          });
        }
        else {
          res.status(401);
          console.log("MUST BE LOGGED IN");
          res.json({msg:'Must be logged in.'});
        }
        break;
      case 'admin':
        if ((req.session.user.role) && (req.session.user.role == 'admin')) {
          return true;
        }
        else {
          res.status(403);
          console.log("MUST BE ADMIN");
          res.json({msg:'Must be admin.'});
          return false;
        }
        break;
    }
  }
  else {
    return false;
  }
}
