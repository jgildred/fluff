
// MONGOOSE SCHEMAS

var mongoose = require('mongoose');

var enums = {
  match_field  : ['name', 'content', 'template', 'firstname', 'lastname', 'email', 'path', 'notes', 'orgname', 'domain'],
  smtp_service : [ "SMTP", "Gmail", "DynectEmail", "Gmail", "hot.ee", "Hotmail", "iCloud", "mail.ee", "Mail.Ru", "Mailgun", "Mailjet", "Mandrill", "Postmark", "QQ", "SendGrid", "SES", "Yahoo", "yandex", "Zoho" ],
  app_service  : [ "Custom", "Heroku", "AppFog" ],
  db_service   : [ "Other MongoDB", "MongoLab" ],
  user_role    : [ "User", "Admin" ],
  user_status  : [ "Active", "Inactive", "Unverified" ],
  access_level : [ "Public", "Users", "Owner", "Admins" ],
  page_status  : [ "Published", "Unpublished" ],
  content_type : [ "text/html", "application/javascript", "text/css", "application/json", "application/xml", "text/plain"]
}
exports.enums = enums;

exports.site = {
  name           : String,
  domain         : String,
  port           : { type: Number,  default: 80 },
  ssl            : { type: Boolean, default: false },
  fluff_path     : { type: String,  default: "/fluff", required: true },
  cors : {
    restricted   : { type: Boolean,  default: false },
    whitelist    : [ String ]
  },
  captcha        : { type: Boolean, default: false },
  email_from     : String,
  smtp : {
    service      : { type: String, enum: enums.smtp_service, default: "Other SMTP" },
    host         : String,
    ssl          : { type: Boolean, default: true },
    port         : { type: Number,  default: 25 },
    username     : String,
    password     : String,
  },
  apikey : {
    required     : { type: Boolean, default: false },
    keychain     : [ String ]
  },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date,    default: Date.now },
  lastupdate     : { type: Date,    default: Date.now }
}

exports.user = {
  firstname      : String, 
  lastname       : String, 
  orgname        : String, 
  email          : { type: String, index: { unique: true } },
  pwhash         : { type: String, required: true, select: false },
  salt           : { type: String, required: true, select: false },
  verifytoken    : { type: String, unique: true },
  phone          : String,
  role           : { type: String, enum: enums.user_role,   default: "User",       required: true },
  status         : { type: String, enum: enums.user_status, default: "Unverified", required: true },
  notes          : String,
  lastlogin      : Date,
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
}

exports.view = {
  name           : { type: String, unique: true },
  template       : { type: String, default: "{{content}}" },
  content_type   : String,
  cursor : { 
    row          : { type: Number, default: 0 },
    column       : { type: Number, default: 0 }
  },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
}

exports.page = {
  name           : String,
  path           : { type: String, index: { unique: true } },
  view_id        : mongoose.Schema.Types.ObjectId,
  content        : String,
  cursor : { 
    row          : { type: Number, default: 0 },
    column       : { type: Number, default: 0 }
  },
  access         : { type: String, enum: enums.access_level, default: "Public", required: true },
  status         : { type: String, enum: enums.page_status,  default: "Unpublished", required: true },
  publication    : { type: Date, default: Date.now },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
}

exports.var = {
  name           : { type: String, unique: true },
  value          : String,
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
}

exports.model = {
  name           : { type: String, unique: true },
  model_id       : { type: String, unique: true },
  schema_data    : String,
  cursor : { 
    row          : { type: Number, default: 0 },
    column       : { type: Number, default: 0 }
  },
  access : {
    view         : { type: String, enum: enums.access_level, default: "Public", required: true },
    create       : { type: String, enum: enums.access_level, default: "Users",  required: true },
    update       : { type: String, enum: enums.access_level, default: "Users",  required: true },
    remove       : { type: String, enum: enums.access_level, default: "Users",  required: true }
  },
  browse_cursor : {
    item_id      : mongoose.Schema.Types.ObjectId,
    attribute    : String
  },
  display_columns : [ {
    name  : String,
    title : String,
    size  : Number
  } ],
  sort_column    : {
    name      : String,
    order     : Boolean
  },
  creator_id     : mongoose.Schema.Types.ObjectId,
  lastupdater_id : mongoose.Schema.Types.ObjectId,
  creation       : { type: Date, default: Date.now },
  lastupdate     : { type: Date, default: Date.now }
}
