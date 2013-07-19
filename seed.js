
// SEED DATA

exports.Data = {
  "sites" : [{
    "name"           : 'Web Site',
    "domain"         : 'localhost',           // used to build site url for external links
    "port"           : 3000,                  // ignored unless config.js app_service is 'Custom'   
    "ssl"            : false,                 // used to build site url for external links
    "email_from"     : 'noreply@domain.com',  // email notifications will come from this address
    "admin_path"     : '/admin',              // change this if it will conflict with any pages
    "cors" : {
      "restricted"   : false,                 // if set to true make sure whitelist is correct
      "whitelist"    : ['http://localhost:3000']
    },
    "smtp" : {
      "service"      : 'Gmail',               // see list in schemas.js (blank = 'SMTP')
      "host"         : 'smtp.domain.com',     // ignored unless service is 'SMTP'
      "port"         : 25,                    // ignored unless service is 'SMTP'
      "ssl"          : true,                  // ignored unless service is 'SMTP'
      "username"     : 'user@domain.com',
      "password"     : 'fluff'
    },
    "apikey" : {
      "required"     : false,                 // if set to true make sure admin index.html has apikey
      "keychain"     : ['1234567890']         // if api is require, you need at least one key in here
    }
  }],
  "users" : [{
    "firstname": "Default",
    "lastname" : "Administrator",
    "email"    : "admin@domain.com",          // make sure this is correct before resetting password
    "password" : "fluff",
    "role"     : "Admin",                     // 'Admin' or 'User'
    "status"   : "Active"                     // 'Active', 'Inactive' or 'Unverified'
  }],
  "pages" : [{
    "name"         : "Home",
    "path"         : "/",                     // page paths must be unique
    "content"      : "<h1 class=\"text-center\">{{var.Greeting}}</h1>",
    "status"       : "Published",             // 'Published' or 'Unpublished'
    "access"       : "Public"                 // 'Public', 'Users' or 'Admins'
  }],
  "views" : [{
    "name"     : "Basic",                     // view names must be unique
    "template" : "<html><head><title>{{var.Title}}</title><link rel=\"stylesheet\" href=\"//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.1/css/bootstrap.css\"/></head><body>{{content}}</body></html>",
    "content_type" : "text/html",
  }],
  "vars"  : [{
    "name"  : "Title",                        // var names must be unique
    "value" : "Hello World"
  }, {
    "name"  : "Greeting",
    "value" : "Hello world."
  }]
}

