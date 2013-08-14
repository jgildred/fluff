Fluff
=====

The CMS that stays out of your way.

INSTALL on local machine:

1. install [Node.js](http://nodejs.org) and [MongoDB](http://mongodb.org) first
2. clone this repo or download the [zip package](https://github.com/jgildred/fluff/archive/master.zip)
3. cd to the root dir of the app
4. type 'npm install'
5. edit config.js: db uri should point to an empty Mongo DB, and set initialize to true
6. type 'node app'
7. open http://localhost:3000/fluff/admin in your browser
8. login with 'admin@domain.com', password 'fluff'
9. goto Site tab in admin and edit settings as needed

INSTALL on Heroku:

1. steps 2 and 3 above
2. edit config.js: app_service is 'Heroku', db service is 'MongoLab', initialize is true
3. create a new app on Heroku and get the MongoLab addon
4. push to Heroku (type 'git push heroku master')
5. open the Heroku app url in your browser
6. steps 8 and 9 above

INSTALL on AppFog:

1. steps 2 and 3 above
2. edit config.js: app_service is 'AppFog', db service is 'MongoDB', initialize is true
3. create a new app on AppFog and bind the MongoDB service
4. push to AppFog (type 'af update [name of app]')
5. open the AppFog app url in your browser
6. steps 8 and 9 above

ADMIN GUIDE:

- the Pages tab manages pages. Each page must use a view template. When editing a page (or view), you can hit Esc to toggle full screen edit view.
- the Views tab manages view templates. Just drop {{content}} into any template, right where you want the page content to render. That is the extent of the page design tools. Let the multitude of Javascript UI toolkits do the rest; that's what they're there for.
- the Vars tab manages custom variables. Vars are an easy way to manage strings you use often. Drop {{var.[name]}} into any page or view, where [name] is the name of the var.
- the Users tab manages all users including admins. The 'Admin' role can access everything; the 'User' role cannot access the Admin app or pages with access restricted to admins.
- the Site tab manages site-wide configuration. Some of these settings can be accessed form within a page. The following tags are available: {{site.name}}, {{site.url}}, {{site.domain}}, {{site.protocol}}, {{site.fluff_path}}

REST API:

See the [README-API.md](README-API.md) for a list of APIs.

TO DO:

- a collection manager like in django admin
- a jslib for easy use of collections in cmspages
- smarter config reloader (stop listening only on port change)
- paging of results
- paged display in admin
- sort by clicking on column headings in admin

WOULD BE NICE:

- list of domains to redirect in site config (for cmspages)
- manage email templates
- manage error pages
- page versioning
- move session timeout to be user specific
- a plugin framework
