
// TOKEN ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.
//
// NOTES: The content model must have the following fields: media_id(unique), content_id, content_url, content_key. Additional fields are ignored. Can only handle one content ID and content key per media item.

var app      = require('../../app'),
    Fluff    = app.Fluff,
    Plug     = require('./plug'),
    models   = require('../../routes/models');

// Preprocessor for GET /token/:env/:type/:media_id?520k_limit=true&rental=true
exports.request = function(req, res){
  app.doIfHasAccess(req, res, 'Public', null, function () {
    Fluff.log.info('OK to allow the request.');
    if (req.params.type) {
      if (req.params.media_id) {
        var EPS_MS3_HOST       = 'ms3-gen';
        var EPS_BB_HOST        = 'bb-gen';
        var EPS_PR_HOST        = 'pr-gen';
        var EPS_TEST_DOMAIN    = 'test.expressplay.com';
        var EPS_TEST_DOMAIN_CN = 'test.expressplay.cn';
        var EPS_PROD_DOMAIN    = 'service.expressplay.com';
        var EPS_PROD_DOMAIN_CN = 'service.expressplay.cn';
        var EPS_MS3_CONTENT_TYPE = {'Content-type' : 'text/uri-list'};
        var EPS_BB_CONTENT_TYPE  = {'Content-type' : 'application/vnd.marlin.drm.actiontoken+xml'};
        var EPS_BB_CONTENT_DISP  = {'Content-Disposition' : 'attachment; filename="license_action_token.xml"'};
        var EPS_ISM_CONTENT_TYPE = {'Content-type' : 'application/vnd.ms-sstr+xml'};
        var EPS_PR_LIC_SERVER_URL = 'http://expressplay-licensing.axprod.net/LicensingService.ashx'; // Note: Using HTTP as Roku is picky with certs

        // Make sure the model exists
        if (app.Models[Fluff.getVal(Plug.config, 'contentModel')]) {
          var Content = app.Models[Fluff.getVal(Plug.config, 'contentModel')];
          var media_id = decodeURIComponent(req.params.media_id);
          Content.findOne({ media_id: media_id }).exec(function (err, item) {
            if (err) {
              Fluff.msgResponse(req, res, 500, 'Error:' + JSON.stringify(err));
            }
            else {
              if (item) {
                if (item.content_id && item.content_key) {
                  var eps_params = '&contentKey=' + encodeURIComponent(item.content_key);
                  if (item.content_url) {
                    eps_params += '&contentURL=' + encodeURIComponent(item.content_url);
                  }
                  var eps_prod = (req.params.env == "production") ? true : false;
                  var eps_type = req.params.type;
                  if (req.params.type == 'pr-ism') eps_type = 'pr';
                  var auth, domain, host, path, content_type_header;
                  var content_type_header = EPS_MS3_CONTENT_TYPE;
                  switch (req.params.env) {
                    case 'production':
                      auth   = Fluff.getVal(Plug.config, 'productionAuthenticator');
                      domain = EPS_PROD_DOMAIN;
                      break;
                    case 'production-china':
                      auth   = Fluff.getVal(Plug.config, 'productionAuthenticatorChina');
                      domain = EPS_PROD_DOMAIN_CN;
                      break;
                    case 'test-china':
                      auth   = Fluff.getVal(Plug.config, 'testAuthenticatorChina');
                      domain = EPS_TEST_DOMAIN_CN;
                      break;
                    default:
                      auth   = Fluff.getVal(Plug.config, 'testAuthenticator');
                      domain = EPS_TEST_DOMAIN;
                  }
                  auth = encodeURIComponent(auth);
                  switch (req.params.type) {
                    case 'bb':
                      host = EPS_BB_HOST + "." + domain;
                      eps_params += '&contentId=' + encodeURIComponent(item.content_id);
                      eps_params += '&actionTokenType=1';
                      eps_params += req.query.rental ? '&rightsType=Rental&rental.periodEndTime=%2B' + Fluff.getVal(Plug.config, 'rentalPeriod') + '&generalFlags=00000001' : '&rightsType=BuyToOwn';
                      eps_params += req.query['520k_limit'] ? '' : '&outputControlOverrideId=urn:marlin:organization:intertrust:wudo&outputControlOverrideParameter=ImageConstraintLevel&outputControlOverrideValue=0';
                      content_type_header = EPS_BB_CONTENT_TYPE;
                      break;
                    case 'pr':
                    case 'pr-ism':
                      host = EPS_PR_HOST + "." + domain;
                      // If the marlin kid prefix is present, remove it
                      if (item.content_id.substr(0,15) == 'urn:marlin:kid:') {
                        eps_params += '&kid=' + encodeURIComponent(item.content_id.substr(15));
                      }
                      else {
                        eps_params += '&kid=' + encodeURIComponent(item.content_id);
                      }
                      eps_params += '&actionTokenType=1';
                      eps_params += req.query.rental ? '&rightsType=Rental&rental.periodEndTime=%2B' + Fluff.getVal(Plug.config, 'rentalPeriod') + '&generalFlags=00000001' : '&rightsType=BuyToOwn';
                      eps_params += req.query['520k_limit'] ? 
                        '&analogVideoOPL=200&compressedDigitalAudioOPL=250&compressedDigitalVideoOPL=0&uncompressedDigitalAudioOPL=250&uncompressedDigitalVideoOPL=250' : '&analogVideoOPL=100&compressedDigitalAudioOPL=100&compressedDigitalVideoOPL=0&uncompressedDigitalAudioOPL=100&uncompressedDigitalVideoOPL=100';
                      break;
                    default:  // ms3
                      host = EPS_MS3_HOST + "." + domain;
                      eps_params += '&contentId=' + encodeURIComponent(item.content_id);
                      eps_params += req.query['520k_limit'] ? 
                        '' : '&extensionType=wudo&extensionCriticalFlag=false&extensionPayload=AAAAAA==';
                  }
                  path = '/hms/' + eps_type + '/token?customerAuthenticator=' + auth + eps_params;

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
                      if (req.params.type == 'pr-ism') {
                        content_type_header = EPS_ISM_CONTENT_TYPE;
                        var http = require('http');
                        Fluff.log.info('Getting smooth manifest: ' + item.content_url);
                        http.request(item.content_url, function (manifest_response) {
                          var manifest = '', content_url = item.content_url;
                          // Set this so that utf16 won't get mangled
                          manifest_response.setEncoding('binary');
                          //another chunk of data has been recieved, so append it to 'token'
                          manifest_response.on('data', function (chunk) {
                            manifest += chunk;
                          });
                          manifest_response.on('end', function () {
                            // If there is a contentURL parameter, then prefer it
                            if (req.query.contentURL) {
                              content_url = req.query.contentURL;
                            }
                            // Make the track urls absolute
                            // Not using an XML parser as can't find one with utf16le support that works
                            var prefix = content_url.slice(0, content_url.search(/\/(?:.(?!\/))+$/));
                            Fluff.log.info("URL prefix: " + prefix + "/");
                            manifest = manifest.replace(/(Url=")(?!\w*:*\/\/)|(Url=')(?!\w*:*\/\/)/ig, 'Url="' + prefix + '/');
                            // Extract the protection header
                            if (getTagVal(manifest, 'ProtectionHeader')) {
                              var custom_data = JSON.parse(token);
                              Fluff.log.info('Original ProtectionHeader base64: ' + getTagVal(manifest, 'ProtectionHeader'));
                              info = new Buffer(getTagVal(manifest, 'ProtectionHeader'), 'base64').toString('utf16le');
                              // Dump any prefix garbage
                              info = info.slice(info.indexOf('WRMHEADER') - 1);
                              Fluff.log.info('Original ProtectionHeader: ' + info);
                              // Insert the custom data info the protection header
                              info = replaceTag(info, 'LA_URL', EPS_PR_LIC_SERVER_URL + "?ExpressPlayToken=" + custom_data.token);
                              Fluff.log.info(JSON.stringify("Updated ProtectionHeader: " + info));
                              var info64 = new Buffer(info, 'utf16le').toString('base64');
                              manifest = replaceTag(manifest, 'ProtectionHeader', info64);
                            }
                            res.writeHead(200, content_type_header);
                            res.end(manifest);
                          });
                        }).end();
                      }
                      else {
                        res.writeHead(200, content_type_header);
                        res.end(token.replace(/_$/,''));
                      }
                    });
                  }).end();
                }
                else {
                  Fluff.msgResponse(req, res, 404, 'The content does not have a valid content_id or content_url. Please check your stored data.');
                }
              }
              else {
                Fluff.msgResponse(req, res, 404, 'Media ID not found. Please check that your database has a content model with the correct media_id.');
              }
            }
          });
        }
        else {
          Fluff.msgResponse(req, res, 404, 'No content is stored in the DB.');
        }
      }
      else {
        Fluff.msgResponse(req, res, 400, 'Missing media ID in the URL.');
      }
    }
    else {
      Fluff.msgResponse(req, res, 400, 'Missing token type in the URL.');
    }
  });
};

// This is put in for license server testing, the route is commented out by default in plug.js
exports.licenseRequest = function (req, res) {
  var host = 'expressplay-licensing.axprod.net';
  var path = '/LicensingService.ashx?ExpressPlayToken=' + req.query.ExpressPlayToken;
  var options = {
    host: host, 
    path: path, 
    method: 'POST',
    headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(req.rawBody)
    }
  },
  https   = require('https');

  Fluff.log.info('Sending request: ' + host + path);

  var rq = https.request(options, function (response) {
    response.setEncoding('utf8');
    var res_data = '';

    //another chunk of data has been recieved, so append it to 'token'
    response.on('data', function (chunk) {
      res_data += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      Fluff.log.info('LIC REQ RESPONSE: ' + res_data);
      res.end(res_data);
    });
  });
  rq.write(req.rawBody);
  rq.end();
};

var getTagVal = function (string, tag) {
  var startregex = new RegExp("<" + tag + "[^>]*>", "gi");
  var start = string.search(startregex) + ((string.match(startregex) ? string.match(startregex)[0].length : 0));
  if (start >= 0) {
    var endregex = new RegExp("</" + tag + "[^>]*>", "gi");
    var end = string.search(endregex);
    
    if (end > 0) {
      var newString = string.slice(start, end);
      return newString
    }
    else {
      return null;
    }
  }
  else {
    return null;
  }
}

var replaceTag = function (string, tag, content) {
  var startregex = new RegExp("<" + tag + "[^>]*>", "gi");
  var start = string.search(startregex) + ((string.match(startregex) ? string.match(startregex)[0].length : 0));
  if (start >= 0) {
    var endregex = new RegExp("</" + tag + "[^>]*>", "gi");
    var end = string.search(endregex);
    if (end > 0) {
      var newString = string.slice(0, start) + content + string.slice(end);
      return newString
    }
    else {
      return null;
    }
  }
  else {
    return null;
  }
}
