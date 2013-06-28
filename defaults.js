
// DEFAULT CONFIGURATION

exports.Config = {
  status        : 'Working',  // set to 'Initialize' to initialize DB with seed data
  site_name     : 'Web Site',
  smtp_service  : 'Gmail',
  smtp_username : 'user@domain.com',
  smtp_password : 'password',
  email_from    : 'noreply@domain.com',
  app_service   : 'Custom Install',   // to run on Heroku, change this to 'Heroku' before push
  db_service    : 'Other MongoDB',    // change to 'MongoLab' if using Heroku MongoLab addon
  db_uri        : 'mongodb://localhost:27017/fluff', // set this when using 'Other MongoDB'
  site_url      : 'http://localhost',
  server_port   : '3000',             // ignored when using Heroku
  admin_path    : '/admin',
  cors_mode     : 'Allow All',        // change to 'Whitelist' to restrict access
  cors_whitelist: ['http://localhost:3000']
}