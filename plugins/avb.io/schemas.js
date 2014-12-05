
// MONGOOSE SCHEMA

var mongoose = require('mongoose');

exports.user = {
firstname   : String, 
lastname    : String, 
orgname     : String, 
email       : { type: String, index: { unique: true } },
pwhash      : { type: String, required: true, select: false },
salt        : { type: String, required: true, select: false },
apikey      : String, 
verifytoken : { type: String, unique: true },
phone       : String, 
promos      : { type: Boolean, default: false },
role        : { type: String, enum: [ "user", "admin" ], default: "user", required: true },
status      : { type: String, enum: [ "active", "inactive", "unverified" ], default: "unverified" },
shipping: {
  status       : { type: String, enum: [ "delivered", "on route" ] }, 
  addressline1 : String, 
  addressline2 : String, 
  city         : String, 
  stateregion  : String, 
  country      : String, 
  postalcode   : String
},
billing: {
  status       : { type: String, enum: [ "up to date", "missing info" ] },
  addressline1 : String, 
  addressline2 : String, 
  city         : String, 
  stateregion  : String, 
  country      : String, 
  postalcode   : String
},
payment: {
  status       : { type: String, enum: [ "up to date", "failed" ] },
  type         : { type: String, enum: [ "visa", "mcard", "amex" ] },
  owner        : String, 
  account      : String, 
  expires      : String, 
  securitycode : String
},
lastlogin  : Date,
creation   : { type: Date, default: Date.now },
lastupdate : { type: Date, default: Date.now }
}

exports.command = {
  device_id  : mongoose.Schema.Types.ObjectId,
  action     : { type: String, enum: [ "restart", "rename", "firmware", "setports", "setstreams", "setvlans", "setroutes", "setap", "setdns", "setdhcp" ] },
  setting    : String,
  creation   : { type: Date, default: Date.now },
  lastupdate : { type: Date, default: Date.now }
}

exports.port = {
  name   : { type: String, index: true },
  number : { type: Number, index: true },
  mac    : { type: String, index: true },
  media  : { type: String, enum: ["100BASE-T", "1000BASE-T"] }, 
  speed  : Number,
  status : { type: String, enum: ["link", ""] },
  avb    : Boolean,
  poe    : Boolean,
  type   : { type: String, enum: ["lan", "wan"] }
}

exports.device = {
user_id      : mongoose.Schema.Types.ObjectId,
uid          : { type: String, index: { unique: true } },
name         : String,
type         : String,
manufacturer : String,
model        : String,
serialno     : String,
firmware     : String,
status       : { type: String, enum: [ "running", "disconnected" ] },
commands     : { type: String, enum: [ "restart", "rename", "firmware", "setports", "setstreams", "setvlans", "setroutes", "setap", "setdns", "setdhcp" ] },
ports: [ {
  name   : { type: String, index: true },
  number : { type: Number, index: true },
  mac    : { type: String, index: true },
  media  : { type: String, enum: ["100BASE-T", "1000BASE-T"] }, 
  capabilities: {
    speed    : Number,
    automdix : Boolean,
    avb      : Boolean,
    poe      : Boolean,
    poelimit : Number },
  status: {
    link     : Boolean,
    speed    : Number,
    mdix     : Boolean,
    avb      : Boolean,
    poe      : Boolean,
    poepower : Number,
    usage    : Number,
    avbusage : Number },
  type   : { type: String, enum: ["lan", "wan"] } } ],
streams: [ {
    id        : String,
    size      : Number,
    talker    : String,
    ingress   : String,
    listeners : [ {
      mac    : String,
      egress : String } ] } ],
lastheartbeat: Date,
creation     : { type: Date, default: Date.now },
lastupdate   : { type: Date, default: Date.now }
}

/*
status: { type: String, validate: function(val) {
  if (val == "running") {
    return true } } },
capabilities: ofString, validate: function(val) {
  for (x = 0; x < val.length; x++) {
    for (y = 0; y < val.length; y++) {
      if (val[x] != )
  }
} [ "switch", "avb", "vlans", "router", "ap", "dns", "dhcp" ],
"routes": [ {
  "source": "000.000.000.000", 
  "dest": "000.000.000.000", 
  "gateway": "000.000.000.000", 
  "mask": "000.000.000.000"} ], 
"nats": [ {
  "port": 80, 
  "dest": "000.000.000.000" } ], 
"vlans": [ {
  "id": "V0", 
  "ports": [ "P1", "P2"] }, {
  "id": "V1", 
  "ports": [ "P0", "P3", "P4" ] } ], 
"streams": [ {
  "id": "S0", 
  "size": "10000000", 
  "talker": "00:00:00:00:00:00", 
  "ingress": "P4",
  "listeners": [ {
    "mac": "00:00:00:00:00:00",
    "egress": "P0" }, {
    "mac": "00:00:00:00:00:00",
    "egress": "P3" } ] } ], 
"ap": {
  "networkid": "Home Wifi",
  "mode": "extended",
  "mac": "00:00:00:00:00:00", 
  "media": "802.11",
  "compatibility": "bgn", 
  "speed": "100",
  "status": "active",
  "avb": "no",
  "status": "active",
  "security": {
    "type": "WPA2-P", 
    "key": "1234567890" }, 
  "clients": [ {
    "mac": "00:00:00:00:00:00",
    "ip": "000.000.000.000" }, {
    "mac": "00:00:00:00:00:00",
    "ip": "000.000.000.000" } ] }, 
"dns": {
  "status": "active",
  "servers": [
    "000.000.000.000",
    "000.000.000.000" ],
  "search_domains": [
    "local" ] },
"dhcp": {
  "status": "active",
  "range_start": "000.000.000.000",
  "range_end": "000.000.000.000",
  "lease_duration": "20000"
},
"creation": "2013-01-10T20:55:36Z", 
"lastupdate": "2013-01-10T20:55:36Z" }
*/