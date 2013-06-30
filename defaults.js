
// DEFAULT CONFIGURATION

exports.Config = {
  status        : 'Working',  // set to 'Initialize' to initialize DB with seed data
  site_name     : 'Web Site',
  smtp_service  : 'Gmail',       // only 'Gmail' supported right now
  smtp_username : 'user@domain.com',
  smtp_password : 'password',           
  email_from    : 'noreply@domain.com', // used in for email notifications
  app_service   : 'Heroku',      // 'Heroku' or 'Custom Install'
  db_service    : 'MongoLab',    // 'MongoLab' or 'Other MongoDB'
  db_uri        : 'mongodb://localhost:27017/fluff', // db_uri required for 'Other MongoDB'
  site_url      : 'http://localhost', // used in email verification message body
  server_port   : '3000',             // ignored when using Heroku
  admin_path    : '/admin',           // change it to avoid conflict with your pages
  cors_mode     : 'Allow All',        // change to 'Whitelist' to restrict access
  cors_whitelist: ['http://localhost:3000']
}