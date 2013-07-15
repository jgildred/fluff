
// SEED DATA

exports.Data = {
  users : [{
    "firstname": "Default",
    "lastname" : "Administrator",
    "email"    : "admin@domain.com",
    "password" : "fluff",
    "apikey"   : "fluff",
    "role"     : "Admin",
    "status"   : "Active"
  }],
  pages : [{
    "name"     : "Home",
    "path"     : "/",
    "content"  : "<h1 class=\"text-center\">{{var.Greeting}}</h1>",
    "status"   : "Published",
    "access"   : "Public"
  }],
  views : [{
    "name"     : "Basic",
    "template" : "<html><head><title>{{var.Title}}</title><link rel=\"stylesheet\" href=\"//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.1/css/bootstrap.css\"/></head><body>{{content}}</body></html>"
  }],
  vars  : [{
    "name"  : "Title",
    "value" : "Hello World"
  }, {
    "name"  : "Greeting",
    "value" : "Hello world."
  }]
}

