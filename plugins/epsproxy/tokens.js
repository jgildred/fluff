
// TOKEN ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    Plug     = require('./plug'),
    models   = require('../../routes/models');

// Preprocessor for GET /token/:env/:type/:content_id?520k_constraint=true&rental=true
exports.request = function(req, res){
  app.doIfHasAccess(req, res, 'Public', null, function () {
    Fluff.log.info('OK to allow the request.');
    if (req.params.type) {
      if (req.params.content_id) {
        var EPS_MS3_ROOT_TEST      = 'ms3-gen.test.expressplay.com';
        var EPS_BB_ROOT_TEST       = 'bb-gen.test.expressplay.com';
        var EPS_PR_ROOT_TEST       = 'pr-gen.test.expressplay.com';
        var EPS_MS3_ROOT_PROD      = 'ms3-gen.service.expressplay.com';
        var EPS_BB_ROOT_PROD       = 'bb-gen.service.expressplay.com';
        var EPS_PR_ROOT_PROD       = 'pr-gen.service.expressplay.com';
        var EPS_AUTHENTICATOR_TEST = Fluff.getVal(Plug.config, 'testAuthenticator'); // ExpressPlay Demo eval account
        var EPS_AUTHENTICATOR_PROD = Fluff.getVal(Plug.config, 'productionAuthenticator'); // ExpressPlay Demo prod account
        var EPS_MS3_CONTENT_TYPE   = {'Content-type' : 'text/uri-list'};
        var EPS_BB_CONTENT_TYPE    = {'Content-type' : 'application/vnd.marlin.drm.actiontoken+xml'};
        var EPS_BB_CONTENT_DISP    = {'Content-Disposition' : 'attachment; filename="license_action_token.xml"'};

        // Make sure the model exists
        if (app.Models[Fluff.getVal(Plug.config, 'contentModel')]) {
          var Content = app.Models[Fluff.getVal(Plug.config, 'contentModel')];
          Content.findOne({ content_id: req.params.content_id }).exec(function (err, item) {
            if (err) {
              Fluff.msgResponse(req, res, 500, 'Error:' + JSON.stringify(err));
            }
            else {
              if (item) {
                if (item.content_key && item.content_url) {
                  var eps_params = '&contentId=' + req.params.content_id;
                  eps_params += '&contentKey=' + item.content_key;
                  eps_params += '&contentURL=' + item.content_url;
                  var eps_prod = (req.params.env == "production") ? true : false;
                  var eps_type = req.params.type;
                  var host, path, content_type_header;
                  var content_type_header = EPS_MS3_CONTENT_TYPE;
                  var auth = (req.params.env == 'production') ? EPS_AUTHENTICATOR_PROD : EPS_AUTHENTICATOR_TEST;
                  switch (req.params.type) {
                    case 'bb':
                      host = (req.params.env == 'production') ? EPS_BB_ROOT_PROD : EPS_BB_ROOT_TEST;
                      eps_params += '&actionTokenType=1';
                      eps_params += req.query.rental ? '&rightsType=Rental&rental.periodEndTime=%2B' + Fluff.getVal(Plug.config, 'rentalPeriod') + '&generalFlags=00000001' : '&rightsType=BuyToOwn';
                      eps_params += req.query['520k_constraint'] ? '&outputControlOverrideId=urn:marlin:organization:intertrust:wudo&outputControlOverrideParameter=ImageConstraintLevel&outputControlOverrideValue=0' : '';
                      content_type_header = EPS_BB_CONTENT_TYPE;
                      break;
                    case 'pr':
                      host = (req.params.env == 'production') ? EPS_PR_ROOT_PROD : EPS_PR_ROOT_TEST;
                      eps_params += '&kid=12345678901234567890123456789012&actionTokenType=1';
                      eps_params += req.query.rental ? '&rightsType=Rental&rental.periodEndTime=%2B' + Fluff.getVal(Plug.config, 'rentalPeriod') + '&generalFlags=00000001' : '&rightsType=BuyToOwn';
                      eps_params += req.query['520k_constraint'] ? 
                        '&analogVideoOPL=200&compressedDigitalAudioOPL=250&compressedDigitalVideoOPL=0&uncompressedDigitalAudioOPL=250&uncompressedDigitalVideoOPL=250' 
                        : '&analogVideoOPL=100&compressedDigitalAudioOPL=100&compressedDigitalVideoOPL=0&uncompressedDigitalAudioOPL=100&uncompressedDigitalVideoOPL=100';
                      break;
                    default:  // ms3
                      host = (req.params.env == 'production') ? EPS_MS3_ROOT_PROD : EPS_MS3_ROOT_TEST;
                      eps_params += req.query['520k_constraint'] ? 
                        '&outputControlFlags=00000001&outputControlValue=000300C1' : '';
                  }
                  path = '/hms/' + req.params.type + '/token?customerAuthenticator=' + auth + eps_params;

                  var options = {host: host, path: path},
                      https   = require('https');

                  Fluff.log.info('Sending request: ' + host + path);
                  https.request(options, function (response) {
                    var token = '';

                    //another chunk of data has been recieved, so append it to 'token'
                    response.on('data', function (chunk) {
                      token += chunk;
                    });

                    //the whole response has been recieved, so we just print it out here
                    response.on('end', function () {
                      res.writeHead(200, content_type_header);
                      res.end(token.replace(/_$/,''));
                    });
                  }).end();
                }
                else {
                  Fluff.msgResponse(req, res, 404, 'The content does not have a valie content_key or content_url. Please check your stored data.');
                }

              }
              else {
                Fluff.msgResponse(req, res, 404, 'Content ID not found. Please check that your database has a content model with the correct content_id.');
              }
            }
          });
        }
        else {
          Fluff.msgResponse(req, res, 404, 'No content is stored in the DB.');
        }
      }
      else {
        Fluff.msgResponse(req, res, 400, 'Missing content ID in the URL.');
      }
    }
    else {
      Fluff.msgResponse(req, res, 400, 'Missing token type in the URL.');
    }
  });
};
