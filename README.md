Fluff
=====

The CMS that stays out of your way.

REQUIREMENTS: 

- Node.js
- MongoDB

INSTALL on local machine:

1. install [Node.js](http://nodejs.org) and [MongoDB](http://mongodb.org) first
2. clone this repo or download the [zip package](https://github.com/jgildred/fluff/archive/master.zip)
3. cd to the root dir of the app
4. type "npm install"
5. edit config.js: db_uri should point to an empty Mongo DB, and set initialize to "true"
6. type "node fluff"
7. open http://localhost:3000/fluff/admin in your browser
8. login with "admin@domain.com", password "fluff"

INSTALL on Heroku:

1. clone this repo or download the [zip package](https://github.com/jgildred/fluff/archive/master.zip)
2. cd to the root dir of the app
3. edit config.js: app_service is "Heroku", db_service is "MongoLab", initialize is "true"
4. create a new app on Heroku and get the MongoLab addon
5. push to Heroku (type "git push heroku master")
6. open the Heroku app url in your browser
7. login with "admin@domain.com", password "fluff"

INSTALL on AppFog:

1. clone this repo or download the [zip package](https://github.com/jgildred/fluff/archive/master.zip)
2. cd to the root dir of the app
3. edit config.js: app_service is "AppFog", db_service is "MongoDB", initialize is "true"
4. create a new app on AppFog and bind the MongoDB service
5. push to AppFog (type "af update [name of app]")
6. open the AppFog app url in your browser
7. login with "admin@domain.com", password "fluff"

ADMIN GUIDE:

- PAGES tab manages pages. Each page must use a view template. When editing a page (or view), you can hit Esc to toggle full screen edit view.
- VIEWS tab manages templates for page layout. Just drop {{content}} into a view's template, right where you want your page content to render, then assign that view to your page. That is the extent of the page design tools. Let the multitude of Javascript UI toolkits do the rest; that's what they're there for.
- VARS tab manages custom variables. Vars are an easy way to manage strings you use often. Drop {{var.[name]}} into any page or view, where [name] is the name of the var.
- MODELS tab manages database models you create for your app. Each model is a collection in the Mongo database, and each model is accessible via REST-style resource route at [fluff_path]/api/[model name]. See [README-API.md](README-API.md) for more. A model's schema format looks like: { name: String, color: String, size: Number }. See Mongoose schema types for a list of allowed types and options.
- USERS tab manages all users including admins. The 'Admin' role can access everything; the 'User' role cannot access the Admin app or pages with access restricted to admins.
- SITE tab manages site-wide configuration. Some of these settings can be accessed from within a page. The following tags are available: {{site.name}}, {{site.url}}, {{site.domain}}, {{site.protocol}}, {{site.fluff_path}}

FLUFF.JS:

The fluff.js library is an easy way to get automatic scaffolding of data into your pages. By simply adding model=[model name] attribute to elements like tables, you can auto-populate the table with data from that model. You can also include query=[query params] attribute with the model attribute to specify necessary query params. There is also the option to include 'noharvest' attribute to avoid initial harvest, and 'norender' attribute to avoid render on initial harvest. Some sub elements can accept a field=[field name] attribute when nested within an element containing a model attribute. There is an example page created upon initialization which includes the fluff.js library. It requires jQuery and Backbone.js which are also included for convenience.

REST API:

See the [README-API.md](README-API.md) for a list of APIs.

PLUGINS:

You can simply put your plugin code into a subfolder in the "plugins" folder. Fluff will scan for plugins on startup. More docs on plugins coming soon.

TESTS:

Currently there is only a basic smoke test. Feel free to add more test cases if you're feeling testy. To run the smoke test, in the root dir of the app type "mocha".

TO DO:

- fluff.js harvest all collections before building
- paging of api GET results
- paged display in admin
- sort in admin list views
- search users

WOULD BE NICE:

- an easy way to add admin tabs for plugins
- list of domains to redirect in site config (for cmspages)
- manage email templates
- manage error pages
- page versioning
- move session timeout to be user specific
- meteor-style auto client updates (maybe)
