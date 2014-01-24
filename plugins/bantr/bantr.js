
// BANTR BRAIN FUNCTIONS

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug');

// React to an utterance
exports.react = function(req, res, callback){

    // This is where the magic happens to pick a response
    var condition = new RegExp(req.body['text'], 'i');
    var filter = {"condition" : condition};
    Plug.Rule.find(filter).exec(function (err, rules) {
      console.log("Matches:");
      console.log(rules);
      if (rules.length > 0) {
        //redirect to ispeech url for 
        var text = rules[app.randomInt(0, rules.length)].response;
        var url = "http://api.ispeech.org/api/rest?apikey=developerdemokeydeveloperdemokey&action=convert&format=mp3&text=" + encodeURIComponent(text);
      }
      else {
        //provide canned response if no match
        var responses = [
          "sorry, I missed that",
          "what was that again?",
          "hmm, I don't get it"
        ];
        var text = responses[app.randomInt(0, responses.length)];
        var url = "http://api.ispeech.org/api/rest?apikey=developerdemokeydeveloperdemokey&action=convert&format=mp3&text=" + encodeURIComponent(text);
      }
      res.redirect(url);
      if (callback) {
        callback(req, res, rules);
      }
    });
};

// Learn from the utterance and record new rules or change existing rules
exports.learn = function(req, res, callback){
  // DUH
};
