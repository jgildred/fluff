
// IDENTITY RESOURCE PREPROCESSOR

var app      = require('../../app'),
    Fluff    = app.Fluff;
    resource = require('../../routes/resource'),
    KP       = require('./plug'),
    PKI      = require('./jsrsasign-latest-all-min');

// Preprocessor for GET /identities
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', KP.Identity, resource.find);
};

// Preprocessor for GET /identities/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', KP.Identity, resource.findone);
};

// Preprocessor for POST /identities
exports.create = function(req, res){
  //if (app.HasAccess(req, res, 'Owner')) {
    // if pkcs5_pem is missing, then keygen
    if (req.body.status != "Empty") {
      //require keys
      if (req.body.password) {
        if (!req.body.pkcs5_pem) {
          var password = req.body.password ? parseInt(req.body.password) : 'passcode';
          var size = req.body.key_size ? parseInt(req.body.key_size) : 2048;
          var dn = req.body.dn ? req.body.dn : null;
          var kp = makeKeyPairWithSelfSignedCert(size, dn, password);
          req.body.pkcs5_pem = kp.priv_pem;
        }
        doCreateWithCert(req, res, kp.cert_pem);
      }
      else {
        app.msgResponse(req, res, 404, 'No password supplied to protect identity.');
      }
    }
    // just create identity with no keys or cert
    else {
      var cert = null;
      if (req.body.pkcs5_pem) {
        delete req.body.pkcs5_pem;
      }
      doCreate(req, res);
    }
  //}
};

// Preprocessor for POST /identities/import
exports.import = function(req, res){
  // TBD
  app.msgResponse(req, res, 404, "Feature not availble.");
};

// Preprocessor for PUT /identities/:id
exports.update = function(req, res){
  if (req.body.role || req.body.status) {
    doUpdate(req, res);
  }
};

// Preprocessor for DELETE /identities/:id
exports.remove = function(req, res){
  if (app.HasAccess(req, res, 'Admins')) {
    resource.remove(req, res, KP.User, null, callback);
  }
};

// Remove unwanted fields in the request object
var CleanParams = function(req, res) {
  console.log("CLEAN PARAMS...");
  if (req.body.pwhash) {
    delete req.body.pwhash;
  }
  if (req.body.salt) {
    delete req.body.salt;
  }
};

var doCreate = function(req, res, callback) {
  CleanParams(req, res);
  req.body.salt = app.randomString();
  req.body.pwhash = saltyHash(req.body.password, req.body.salt);
  resource.create(req, res, KP.Identity, callback);
};

var doCreateWithCert = function(req, res, certPem) {
  CleanParams(req, res);
  req.body.salt   = app.randomString();
  req.body.pwhash = saltyHash(req.body.password, req.body.salt);
  // Insert new identity into DB
  resource.create(req, res, KP.Identity, function (req, res, resData) {
    var certData = buildCertData (req, res, certPem);
    KP.Certificate.create(certData, function (err, data) {
      if (err) {
        app.msgResponse(req, res, 500, 'Identity created, but self-signed certificate could not be created. ' + JSON.stringify(err));
      }
      else { 
        if (resData) { 
          res.json(resData);
        }
        else {
          app.msgResponse(req, res, 404, 'Identity created, but self-signed certificate could not be created.');
        }
      }
    });
  });
};

var buildCertData = function (req, res, certPem) {
  // Create cert object to extract info
  var certObj = new PKI.X509();
  certObj.readCertPEM(certPem);
  return {
    subject_dn   : req.body.dn,
    issuer_dn    : req.body.dn,
    display_name : req.body.display_name ? req.body.display_name : req.body.name,
    notes        : req.body.notes,
    x509_pem     : certPem,
    valid_from   : utcToDate(certObj.getNotBefore()),
    valid_until  : utcToDate(certObj.getNotAfter()),
    serial       : certObj.getSerialNumberHex(),
    version      : 3,
    signature_algorithm : "SHA-1 with RSA Encryption",
    parameters   : null,
    public_key_info : {
      algorithm  : "RSA Encryption",
      parameters : null,
      public_key : PKI.KEYUTIL.getKey(certPem).n,
      exponent   : PKI.KEYUTIL.getKey(certPem).e,
      key_size   : 2048,
      key_usage  : [ "Encrypt", "Verify", "Wrap", "Derive" ],
    },
    fingerprints : [{
      algorithm : "Sha-1",
      digest    : PKI.KJUR.crypto.Util.hashString(certObj.hex, 'sha1')
    },
    {
      algorithm : "MD5",
      digest    : PKI.KJUR.crypto.Util.hashString(certObj.hex, 'md5')
    }]
  };
}

var doUpdate = function(req, res) {
  CleanParams(req, res);
  var callback = null;
  if (req.session.user.id == req.params.id) {
    callback = updateSession;
  }
  resource.update(req, res, app.User, null, callback);
};

var updateSession = function(req, res, user) {
  if (user) {
    req.session.user.email   = user.email;
    req.session.user.role    = user.role;
    req.session.user.displayname = user.displayname;
    console.log("SESSION UPDATED: " + JSON.stringify(req.session));
  }
};

var saltyHash = function (text, salt) {
  var crypto = require('crypto');
  return crypto.createHash('md5').update(text + salt).digest("hex");
}
exports.saltyHash = saltyHash;

var makeToken = function () {
  return encodeURIComponent(app.randomString());
};
exports.makeToken = makeToken;

var makeKeyPairWithSelfSignedCert = function (size, dn, password) {
  // generate key pair
  size = size ? size : 2048;
  var keypair = PKI.KEYUTIL.generateKeypair("RSA", size);
  var prvKey  = keypair.prvKeyObj;
  var pubKey  = keypair.pubKeyObj;
  var privPem = PKI.KEYUTIL.getEncryptedPKCS5PEMFromRSAKey(prvKey, password);

  //var dn  = PKI.KJUR.asn1.x509.X500Name({'str' : '/C=US/O=TEST'});
  //var hex = dn.getEncodedHex();
  //console.log(hex);

  // generate TBSCertificate
  var o = new PKI.KJUR.asn1.x509.TBSCertificate();
  o.setSerialNumberByParam({'int'  : app.randomString()});
  o.setSignatureAlgByParam({'name' : 'SHA1withRSA'});
  o.setIssuerByParam( {'str' : objToDn(dn)});
  o.setSubjectByParam({'str' : objToDn(dn)});
  var now = new Date();
  var notBefore  = dateToGt(now);
  var lifeInDays = 365;
  var later = new Date(now.getTime() + (lifeInDays * 24 * 60 * 60000));
  var notAfter   = dateToGt(later);
  o.setNotBeforeByParam({'type' : 'gen', 'str' : notBefore}); // GeneralizedTime
  o.setNotAfterByParam( {'type' : 'gen', 'str' : notAfter});
  
  o.setSubjectPublicKeyByParam({'rsakey' : pubKey});
  o.appendExtension(
  　　new PKI.KJUR.asn1.x509.BasicConstraints({'cA' : true}));
  o.appendExtension(
  　　new PKI.KJUR.asn1.x509.KeyUsage({'bin' : '11'}));

  // issue certificate
  var crt = new PKI.KJUR.asn1.x509.Certificate({'tbscertobj' : o, 'rsaprvkey' : prvKey});
  crt.sign();
  var certPem = crt.getPEMString();
  return {priv_pem:privPem, cert_pem:certPem};
};

var _parsePKCS5PEM = function(sPKCS5PEM) {
  var info = {};
  var i1 = -1;
  if (sPKCS5PEM.match(new RegExp("DEK-Info: ([^,]+),([0-9A-Fa-f]+)", "m"))) {
      info.cipher = RegExp.$1;
      info.ivsalt = RegExp.$2;
  }
  if (sPKCS5PEM.match(new RegExp("-----BEGIN ([A-Z]+) PRIVATE KEY-----"))) {
      info.type = RegExp.$1;
      i1 = sPKCS5PEM.indexOf("KEY-----") + 8;
  }
  var lenNEWLINE = 0;
  if (sPKCS5PEM.indexOf("\r\n\r\n") != -1) {
      i1 = sPKCS5PEM.indexOf("\r\n\r\n");
      lenNEWLINE = 2;
  }
  if (sPKCS5PEM.indexOf("\n\n") != -1) {
      i1 = sPKCS5PEM.indexOf("\n\n");
      lenNEWLINE = 1;
  }
  var i2 = sPKCS5PEM.indexOf("-----END");
  if (i1 != -1 && i2 != -1) {
      var s = sPKCS5PEM.substring(i1 + lenNEWLINE * 2, i2 - lenNEWLINE);
      s = s.replace(/\s+/g, '');
      info.data = s;
  }
  return info;
};

var zpad = function (string, size) {
  string = string.toString();
  size = size ? size : 2;
  var difference = size - string.length;
  var padding = '';
  for (var i = 0; i < difference; i++) {
    padding += '0';
  }
  return padding + string;
}

var dateToGt = function (date) {
  date = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  var gt = '' + date.getFullYear();
  gt += zpad(date.getMonth() + 1);
  gt += zpad(date.getDate());
  gt += zpad(date.getHours());
  gt += zpad(date.getMinutes());
  gt += zpad(date.getSeconds()) + 'Z';
  return gt;
};

// must be utc format string with 2-digit year
var utcToDate = function (utc) {
  var date = new Date(
    utc.substr(0,2),
    utc.substr(2,2), 
    utc.substr(4,2), 
    utc.substr(6,2), 
    utc.substr(8,2), 
    utc.substr(10,2)
  );
  date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return date;
};

// Helper functions
var objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

// '/C=US/O=zz/OU=xx/OU=yy/CN=ff/DC=xx'
var dnToObj = function (dnString) {
  var elements = dnString.split('/');
  var obj = {};
  delete elements[0];
  elements.forEach(function (element) {
    var name  = element.split('=')[0].toUpperCase();
    var value = element.split('=')[1];
    if (obj[name]) {
      if (objectType(obj[name]) == 'Array') {
        obj[name].push(value);
      }
      else {
        obj[name] = [obj[name], value];
      }
    }
    else {
      obj[name] = value;
    }
  });
  return obj;
};

var objToDn = function (obj) {
  var dnString = "";
  for (element in obj) {
    if (objectType(obj[element]) == 'Array') {
      obj[element].forEach(function (item) {
        dnString += "/" + element.toUpperCase() + "=" + item;
      });
    }
    else {
      dnString += "/" + element.toUpperCase() + "=" + obj[element];
    }
  }
  return dnString;
}
