
// BANTR BRAIN FUNCTIONS

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// React to an utterance
exports.react = function(req, res, utterance, callback){

  // This is where the magic happens to pick a response

  // First check to see if it's a request to learn
  var condition = new RegExp('i say [\\s\\S]+ you say [\\s\\S]+', 'gi');
  if (condition.test(utterance.text)) {
    var fileName = "ok_ill_try_to_remember_that";
    var url = Plug.cdnUrlPrefix + "/audio/" + fileName + ".mp3";
    var body = {
      text:   text,
      audio:  url,
      format: "mp3"
    };
    res.json(body);
    if (callback) {
      callback(utterance, rules);
    }
  }

  else {
    // Next check if it matches any existing rules
    var condition = new RegExp(utterance.text, 'gi');
    var filter = {"condition" : condition};
    Plug.Rule.find(filter).exec(function (err, rules) {
      console.log("Rule matches: " + rules.length);
      if (rules.length > 0) {
        //redirect to ispeech url for 
        var text = rules[app.randomInt(0, rules.length - 1)].response;
        console.log("RULES LENGTH "+rules.length);
        console.log("RANDOM RULE "+app.randomInt(0, rules.length - 1));
        var url  = Plug.iSpeechUrlPrefix + encodeURIComponent(text);
      }
      else {
        // Provide canned response if no match
        var responses = [
          "what_was_that_again",
          "sorry_i_missed_that",
          "im_not_sure_what_you_mean"
        ];
        var fileName = responses[app.randomInt(0, responses.length - 1)];
        var url = Plug.cdnUrlPrefix + "/audio/" + fileName + ".mp3";
      }
      var body = {
        text:   text,
        audio:  url,
        format: "mp3"
      };
      res.json(body);
      if (callback) {
        callback(utterance, rules);
      }
    });
  }
};

// Learn from the utterance and record new rules or change existing rules
exports.learn = function(utterance, rules){
  // DUH
};
