
// SEED DATA

exports.Data = {
  "site" : {
    "name"           : 'Web Site',
    "domain"         : 'localhost',   // used to build site url for external links
    "port"           : 3000,          // ignored unless config.js app_service is 'Custom'   
    "ssl"            : false,         // used to build site url for external links
    "email_from"     : 'noreply@domain.com', // email notifications from this address
    "fluff_path"     : '/fluff',      // change this if it will conflict with any pages
    "cors" : {
      "restricted"   : false,         // if set to true make sure whitelist is correct
      "whitelist"    : ['http://localhost:3000']
    },
    "smtp" : {
      "service"      : 'Gmail',       // see list in schemas.js ('' is same as 'SMTP')
      "host"         : 'smtp.domain.com', // ignored unless service is 'SMTP'
      "port"         : 25,            // ignored unless service is 'SMTP'
      "ssl"          : true,          // ignored unless service is 'SMTP'
      "username"     : 'user@domain.com',
      "password"     : 'fluff'
    },
    "apikey" : {
      "required"     : false,         // if true make sure admin index.html has apikey
      "keychain"     : ['1234567890'] // if api is require, you need at least one key in here
    }
  },
  "users" : [{
    "firstname": "Default",
    "lastname" : "Administrator",
    "email"    : "admin@domain.com", // make sure this is correct before resetting password
    "password" : "fluff",
    "role"     : "Admin",            // 'Admin' or 'User'
    "status"   : "Active"            // 'Active', 'Inactive' or 'Unverified'
  }],
  "pages" : [{
    "name"         : "Home",
    "path"         : "/",            // page paths must be unique
    "content"      : "<h1 class=\"text-center example\">{{var.Greeting}}</h1>",
    "status"       : "Published",    // 'Published' or 'Unpublished'
    "access"       : "Public"        // 'Public', 'Users' or 'Admins'
  },{
    "name"         : "Styles",
    "path"         : "/styles.css",  // page paths must be unique
    "content"      : ".example {\n\tmargin-left: auto;\n\tmargin-right: auto;\n}\nh1.example {\n\tmargin-top: 50px;\n\tmargin-bottom: 50px;\n}\ntable.example th,td {\n\tfont-size: 20px;\n\tpadding: 10px;\n}",
    "status"       : "Published",    // 'Published' or 'Unpublished'
    "access"       : "Public"        // 'Public', 'Users' or 'Admins'
  }],
  "views" : [{
    "name"         : "Basic",        // view names must be unique
    "template"     : "<html>\n<head>\n<title>{{var.Title}}</title>\n<link rel=\"stylesheet\" href=\"/fluff/css/bootstrap.css\"/>\n<link rel=\"stylesheet\" href=\"/styles.css\"/>\n<script type=\"text/javascript\" src=\"/fluff/js/jquery.js\"></script>\n<script type=\"text/javascript\" src=\"/fluff/js/underscore.js\"></script>\n<script type=\"text/javascript\" src=\"/fluff/js/backbone.js\"></script>\n<script type=\"text/javascript\" src=\"/fluff/js/fluff.js\"></script>\n</head>\n<body>\n{{content}}\n<script>Fluff.init()</script>\n</body>\n</html>",
    "content_type" : "text/html",
  },{
    "name"         : "CSS",          // view names must be unique
    "template"     : "{{content}}",
    "content_type" : "text/css",
  }],
  "vars"  : [{
    "name"  : "Title",               // var names must be unique
    "value" : "Hello World"
  }, {
    "name"  : "Greeting",
    "value" : "Hello world."
  }],
  "models"  : [{
    "name"     : "Things",           // model names must be unique, should be plural
    "model_id" : "things",           // model_id must be unique, should be plural and lower case
    "schema_data"  : "{\nname: String,\ncolor: String,\ngood: Boolean\n}", // defines the fields of the model
    "display_columns" : [{
      "name"  : "name",
      "title" : "Name",
      "size"  : 100
    }, {
      "name"  : "color",
      "title" : "Color",
      "size"  : 100
    }, {
      "name"  : "good",
      "title" : "Good",
      "size"  : 50
    }],
    "column_order" : ["name", "color", "good"], // this is replaced by display_columns
    "sort_column"  : {
      "name"  : "name",              // the name of the column by which to sort
      "order" : true                 // the direction of the sort (true = ascending)
    }
  }]
}

