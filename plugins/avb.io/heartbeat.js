
// HEARTBEAT HANDLER

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// Response for PUT with uid
exports.process = function(req, res){
  if (req.body._id) { delete req.body._id; }
  if (req.body.uid) { req.body.uid = req.params.uid; }
  if (req.params._id) { delete req.params._id; }
  app.Device.update({"uid": req.params.uid}, req.body, {upsert: true}, function (err, device) {
    if (err) { var body = err; }
    else {
      app.Command.find({"device_id": device._id}, function (err, data) {
        if (err) { var body = err; }
        else { var body = data; }
        console.log("HEARTBEAT:\n" + body);
      });
    }
    res.send(body);
  });
};
