
// DEFAULT CONFIGURATION

exports.Config = {
  initialize     : false,                 // set to true to initialize DB with seed data
  name           : 'Web Site',
  domain         : 'localhost',           // used in email verification message body
  port           : 3000,                  // ignored unless app_service is 'Custom Install'   
  ssl            : false,                 // used in constructing site url
  email_from     : 'noreply@domain.com',  // used for email notifications
  app_service    : 'Custom Install',      // 'Heroku' or 'Custom Install'
  db : {
    service      : 'Other MongoDB',       // 'MongoLab' or 'Other MongoDB'
    uri          : 'mongodb://localhost:27017/fluff' // uri required for 'Other MongoDB'
  },
  admin_path     : '/admin',              // change it to avoid conflict with your pages
  cors : {
    restricted   : false,                 // careful, if set to true make sure whitelist is correct
    whitelist    : ['http://localhost:3000']
  },
  smtp : {
    service      : 'Gmail',               // see list in schemas.js
    host         : 'smtp.domain.com',     // ignored unless service is 'Other SMTP'
    port         : 25,                    // ignored unless service is 'Other SMTP'
    ssl          : true,                  // ignored unless service is 'Other SMTP'
    username     : 'user@domain.com',
    password     : 'password'
  },
  apikey : {
    required     : false,                 // if set to true make sure admin index.html has apikey
    keychain     : ['1234567890']
  }
}