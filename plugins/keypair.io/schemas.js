
// MONGOOSE SCHEMAS FOR Keypair.io

var mongoose = require('mongoose');

var enums = {
  cert_types         : ["TLS", "SSH", "SMIME"],
  identity_status    : ["Active", "Inactive", "Empty"],
  certificate_status : ["Active", "Inactive", "Revoked"]
};
exports.enums = enums;

var dn = {
  serialnumber : String,  // Certificate serial number
  mail   : String,  // Email address
  e      : String,  // Email address (Deprecated in preference to MAIL)
  uid    : String,  // Unique ID or user identifier
  userid : String,  // User identifier
  cn     : String,  // Common Name
  t      : String,  // Title
  ou     : [ String ],  // Organizational Unit name
  dc     : [ String ],  // Domain component
  o      : String,  // Organization name
  street : String,  // Street / First line of address
  l      : String,  // Locality name
  st     : String,  // State or Province name
  sp     : String,  // State or Province name
  s      : String,  // State or Province name
  pc     : String,  // Postal code / zip code
  c      : String,  // Country
  unstructuredname    : String,  // Host name
  unstructuredaddress : String,  // IP address
  dnq    : String  // Distinguished name qualifier
};

exports.identity = {
  user_id  : mongoose.Schema.Types.ObjectId,
  name     : String,
  dn       : dn,
  image_url      : String,
  notes          : String,
  pkcs5_pem      : String,
  pwhash         : { type: String, required: true, select: false },
  salt           : { type: String, required: true, select: false },
  public_key_info : {
    algorithm    : String,
    parameters   : String,
    public_key   : String,
    exponent     : Number,
    key_size     : Number,
    key_usage    : [ String ]
  },
  crl            : String,
  status         : { type: String,
                     enum: enums.identity_status,
                     default: "Active", required: true },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
};

exports.certificate = {
  identity_id  : mongoose.Schema.Types.ObjectId,
  name         : String,
  subject_dn   : dn,
  issuer_dn    : dn,
  image_url      : String,
  valid_from     : Date,
  valid_until    : Date,
  serial         : String,
  version        : Number,
  signature_algorithm : String,
  parameters     : String,
  public_key_info : {
    algorithm    : String,
    parameters   : String,
    public_key   : String,
    exponent     : Number,
    key_size     : Number,
    key_usage    : [ String ]
  },
  signature      : String,
  extensions     : [{
    id    : String,
    data  : String
  }],
  notes          : String,
  x509_pem       : String,
  fingerprints   : [{
    algorithm   : String,
    digest      : String
  }],
  status         : { type: String,
                     enum: enums.identity_status,
                     default: "Active", required: true },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
};
