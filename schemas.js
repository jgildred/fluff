
// MONGOOSE SCHEMAS

var mongoose = require('mongoose');

var enums = {
  smtp_service : [ "Other SMTP", "Gmail", "DynectEmail", "Gmail", "hot.ee", "Hotmail", "iCloud", "mail.ee", "Mail.Ru", "Mailgun", "Mailjet", "Mandrill", "Postmark", "QQ", "SendGrid", "SES", "Yahoo", "yandex", "Zoho" ],
  app_service  : [ "Custom Install", "Heroku" ],
  db_service   : [ "Other MongoDB", "MongoLab" ],
  user_role    : [ "User", "Admin" ],
  user_status  : [ "Active", "Inactive", "Unverified" ],
  page_access  : [ "Public", "Users", "Admins" ],
  page_status  : [ "Published", "Unpublished" ]
}
exports.enums = enums;

exports.site = {
  name          : String,
  domain        : String,
  port          : { type: Number,  default: 80 },
  ssl           : { type: Boolean, default: false },
  admin_path    : { type: String,  default: "/admin", required: true },
  cors : {
    restricted  : { type: Boolean,  default: false },
    whitelist   : [ String ]
  },
  email_from    : String,
  smtp : {
    service     : { type: String, enum: enums.smtp_service, default: "Other SMTP" },
    host        : String,
    ssl         : { type: Boolean, default: true },
    port        : { type: Number,  default: 25 },
    username    : String,
    password    : String,
  },
  apikey : {
    required    : { type: Boolean, default: false },
    keychain    : [ String ]
  },
  creator_id    : mongoose.Schema.Types.ObjectId,
  creation      : { type: Date,    default: Date.now },
  lastupdate    : { type: Date,    default: Date.now }
}

exports.user = {
  firstname   : String, 
  lastname    : String, 
  orgname     : String, 
  email       : { type: String, index: { unique: true } },
  pwhash      : { type: String, required: true, select: false },
  salt        : { type: String, required: true, select: false },
  verifytoken : { type: String, unique: true },
  phone       : String,
  role        : { type: String, enum: enums.user_role,   default: "User",       required: true },
  status      : { type: String, enum: enums.user_status, default: "Unverified", required: true },
  notes       : String,
  lastlogin   : Date,
  creator_id  : mongoose.Schema.Types.ObjectId,
  creation    : { type: Date, default: Date.now },
  lastupdate  : { type: Date, default: Date.now }
}

exports.view = {
  name         : { type: String, unique: true },
  template     : { type: String, default: "{{content}}" },
  creator_id   : mongoose.Schema.Types.ObjectId,
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
  creator_id   : mongoose.Schema.Types.ObjectId,
  creation     : { type: Date, default: Date.now },
  lastupdate   : { type: Date, default: Date.now }
}

exports.var = {
  name         : { type: String, unique: true },
  value        : String,
  creator_id   : mongoose.Schema.Types.ObjectId,
  creation     : { type: Date, default: Date.now },
  lastupdate   : { type: Date, default: Date.now }
}
