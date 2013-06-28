
// MONGOOSE SCHEMAS

var mongoose = require('mongoose');

var enums = {
  site_status  : [ "Initialize", "Working" ],
  smtp_service : [ "Gmail" ],
  app_service  : [ "Heroku", "Custom Install" ],
  db_service   : [ "MongoLab", "Other MongoDB" ],
  cors_mode    : [ "Allow All", "White List" ],
  user_role    : [ "User", "Admin" ],
  user_status  : [ "Active", "Inactive", "Unverified" ],
  page_access  : [ "Public", "Users", "Admins" ],
  page_status  : [ "Published", "Unpublished" ]
}
exports.enums = enums;

exports.site = {
  site_name     : String,
  smtp_service  : { type: String, enum: enums.smtp_service, default: "Gmail" },
  smtp_username : String,
  smtp_password : String,
  email_from    : String,
  site_url      : String,
  server_port   : { type: String },
  admin_path    : { type: String, default: "/admin", required: true },
  cors_mode     : { type: String, enum: enums.cors_mode,   default: "Allow All" },
  cors_whitelist: [ String ]
}

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
role        : { type: String, enum: enums.user_role, default: "User", required: true },
status      : { type: String, enum: enums.user_status, default: "Unverified", required: true },
lastlogin  : Date,
creation   : { type: Date, default: Date.now },
lastupdate : { type: Date, default: Date.now }
}

exports.view = {
name         : { type: String, unique: true },
template     : { type: String, default: "{{content}}" },
creation     : { type: Date, default: Date.now },
lastupdate   : { type: Date, default: Date.now }
}

exports.page = {
name         : String,
path         : { type: String, index: { unique: true } },
view_id      : mongoose.Schema.Types.ObjectId,
content      : String,
access       : { type: String, enum: enums.page_access, default: "Public", required: true },
status       : { type: String, enum: enums.page_status, default: "Unpublished", required: true },
publication  : { type: Date, default: Date.now },
creation     : { type: Date, default: Date.now },
lastupdate   : { type: Date, default: Date.now }
}

exports.var = {
name         : { type: String, unique: true },
value        : String,
creation     : { type: Date, default: Date.now },
lastupdate   : { type: Date, default: Date.now }
}
