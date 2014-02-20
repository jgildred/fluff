
// BANTR BRAIN FUNCTIONS

var app      = require('../../app'),
    Fluff    = app.Fluff,
    resource = require('../../routes/resource'),
    Plug     = require('./plug'),
    Knwl     = require('./knwl'),
    WordPos  = require('wordpos');

// React to an utterance
exports.react = function(req, res, utterance){

  // This is where the magic happens to pick a response

  // First check to see if it's a request to learn
  var condition = new RegExp('i say [\\s\\S]+ you say [\\s\\S]+', 'i');
  if (condition.test(utterance.text)) {
    var fileName = "ok_ill_try_to_remember_that";
    var url = Plug.cdnUrlPrefix + "/audio/" + fileName + ".mp3";
    var body = {
      text:   "ok i'll try to remember that",
      audio:  url,
      format: "mp3"
    };
    var newRule = condition.exec(utterance.text)[0].toLowerCase().split("i say ")[1].split(" you say ");
    // Bleep any words with *, like f***
    var condition = new RegExp('\\b.\\*+', 'i');
    newRule[1] = newRule[1].replace(condition, "bleep");
    // Bleep any censored words
    censored.forEach(function(word) {
      newRule[1] = newRule[1].replace(word, "bleep");
    });
    var rule = {
      condition : newRule[0],
      response  : newRule[1]
    };
    Plug.Rule.create(rule, function () {
      res.json(body);
    });
  }
  else {
    // Next check if it matches any existing rules
    var condition = new RegExp(utterance.text, 'gi');
    var filter = {"condition" : condition};
    Plug.Rule.find(filter).exec(function (err, rules) {
      console.log("Rule matches: " + rules.length);
      if (rules.length > 0) {
        var text = rules[app.randomInt(0, rules.length - 1)].response;
        var url  = Plug.iSpeechUrlPrefix + encodeURIComponent(text);
        utteranceResponse(res, text, url);
      }
      else {
        // Next try to match again without "banter"
        var condition = new RegExp('(^banter|banter$)', 'i');
        if (condition.test(utterance.text)) {
          var phrase = utterance.text.replace(condition, "").trim();
          var condition = new RegExp(phrase, 'gi');
          var filter = {"condition" : condition};
          Plug.Rule.find(filter).exec(function (err, rules) {
            console.log("Rule matches: " + rules.length);
            if (rules.length > 0) {
              var text = rules[app.randomInt(0, rules.length - 1)].response;
              var url  = Plug.iSpeechUrlPrefix + encodeURIComponent(text);
              utteranceResponse(res, text, url);
            }
            else {
              // Do something smart
              wordpos = new WordPos();
              wordpos.getVerbs(utterance.text, function(result){
                if (result.length > 0) {
                  var text = "Did you say " + result[0] + "?";
                  var url  = Plug.iSpeechUrlPrefix + encodeURIComponent(text);
                  utteranceResponse(res, text, url);
                }
                else {
                  fallBackResponse(req, res);
                }
              });
            }
          });
        }
        else {
          fallBackResponse(req, res);
        }
      }
    });
  }
};

var fallBackResponse = function (req, res) {
  // Provide canned response if no match
  var responses = [
    "what_was_that_again",
    "sorry_i_missed_that",
    "im_not_sure_what_you_mean",
    "let_me_google_that",
    "here_is_a_google_search",
    "i_have_no_idea_what_you_said"
  ];
  var text = "i'm not sure what you mean";
  var fileName = responses[app.randomInt(0, responses.length - 1)];
  var url = Plug.cdnUrlPrefix + "/audio/" + fileName + ".mp3";
  utteranceResponse(res, text, url);
}

var utteranceResponse = function (res, text, url) {
  var body = {
    text:   text,
    audio:  url,
    format: "mp3"
  };
  res.json(body);
}

// Learn from the utterance and record new rules or change existing rules
exports.learn = function(utterance, rules){
  // DUH
};

// Naughty bits
var censored = [
  "fuck","shit","shits","cock","cocks","dick","dicks","asshole","assholes","pussy","pussies","cunt","cunts","kunt","kunts","fucker","fuckers","shitty","fucking","twat","twats","twot","twots","tit","tits","titty","titties","anal","butthole","buttholes"
];
