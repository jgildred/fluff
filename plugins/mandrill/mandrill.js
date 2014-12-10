
// MANDRILL RESOURCE ROUTE HANDLER

// Dependencies
var app         = require('../../app'),
    Fluff       = app.Fluff,
    Plug        = require('./plug'),
    mandrillApi = require('mandrill-api');

// Setup globals
var mandrill_client = new mandrillApi.Mandrill(Fluff.getVal(Plug.config, 'apikey'));

/* Example request:
POST /api/mandrill/send
BODY:
{
  recipients : [{
    "email" : "john@gildred.com",
    "name"  : "John Gildred"
  },{
    "email" : "biggles@gildred.net",
    "name"  : "Mr. Bigglesworth"
  }],
  template : "expressplay",
  content  : [{
    "name"    : "header",
    "content" : "This is the Header"
  },{
    "name"    : "body",
    "content" : "This is the body text."
  }],
  subject : "A Message from ExpressPlay"
} */
exports.send = function(req, res){
  app.doIfHasAccess(req, res, 'Users', null, function(req, res) {
    if (req.body.recipients) {
      Fluff.log.info("LIST TYPE: " + objectType(req.body.recipients));
      if (objectType(req.body.recipients) == 'Array') {
        var recipients = req.body.recipients;
      }
      else {
        // If not an array then you need to make it one
        var recipients = [];
        var index = 0;
        while (req.body.recipients[index]) {
          recipients.push(req.body.recipients[index]);
          index++;
        }
      }
      var content = [];
      if (req.body.content) {
        if (req.body.content.header) {
          content.push({
            name: "header",
            content: req.body.content.header
          });
        }
        if (req.body.content.body) {
          content.push({
            name: "body",
            content: req.body.content.body
          });
        }
      }
      asyncLoop.start({
        array: recipients,
        onloop: sendMessage,
        step: 1,
        delay: 0,
        template_name: req.body.template ? req.body.template : Fluff.getVal(Plug.config, 'default_template'),
        template_content: (content.length > 0) ? content : null,
        message: { subject: req.body.subject, to: [] },
        qty_sent: 0,
        callback: function (options) {
          SendNotificationEmail({
            qty_sent: options.qty_sent,
            qty_failed: recipients.length - options.qty_sent
          });
        }
      });
      app.msgResponse(req, res, 200, 'Sent request for ' + recipients.length + ' messages to Mandrill.');
    }
  });
};

// A generic asynchronous control loop
// Use asyncLoop.next(options) in another function to interate loop
/* Use asyncLoop.start({
      array: [],
      onloop: function,
      step: 1,
      delay: 0,
      callback: function () {
        Fluff.log.info('LOOP DONE');
      }
    }); to start the loop */
var asyncLoop = {
  // Loop start
  start: function (options) {
    options.index = options.index ? options.index : 0;
    options.onloop(options);
  },
  // Loop iteration
  next: function (options) {
    // Delay on each set of requests for a rate limited function or API
    options.delay = options.delay ? options.delay : 1500;
    // If there are more items left, do the next
    if ((options.index != undefined) && (options.array.length > (options.index + options.step))) {
      setTimeout(function () {
        options.index = options.index + options.step;
        options.onloop(options);
      }, options.delay);
    }
    else {
      // This is called at the end of the loop
      if (options.callback) {
        options.callback(options);
      }
    }
  }
};

var sendMessage = function (options) {
  if (options) {
    var message = options.message;
    message.to = [options.array[options.index]];
    mandrill_client.messages.sendTemplate(
      {
        "template_name"    : options.template_name,
        "template_content" : options.template_content,
        "message"          : message
      },
      function(result) {
        Fluff.log.info(options.array[options.index].email + " sent");
        //Fluff.log.info(JSON.stringify(options.template_content));
        options.qty_sent++;
        asyncLoop.next(options);
      },
      function(error) {
        // Mandrill returns the error as an object with name and message keys
        Fluff.log.info('A mandrill error occurred: ' + error.name + ' - ' + error.message);
        asyncLoop.next(options);
      }
    );
  }
  else {
    Fluff.log.info('No ARRAY for asyncLoop.');
    asyncLoop.next(options);
  }
};

var SendNotificationEmail = function(options) {
  if (options) {
    Fluff.emailToUser({
      user: req.session.user,
      subject: "Your Email Campaign is Completed",
      body:    "Hi " + req.session.user + "\n\n" 
             + options.qty_sent + " emails were delivered,\n\n"
             + options.qty_failed + " emails failed."
    });
  }
};

// Helper function
var objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}
