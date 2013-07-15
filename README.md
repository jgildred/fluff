fluff
=====

The CMS that stays out of your way.

Install on local machine:

1. install [Node.js](http://nodejs.org) and [MongoDB](http://mongodb.org) first
2. clone this repo or download the [zip package](https://github.com/jgildred/fluff/archive/master.zip)
3. cd to the root dir of the app
4. type 'npm install'
5. edit defaults.js: db uri points to an empty Mongo DB, initialize is true
6. type 'node app'
7. open http://localhost:3000/admin in your browser
8. login with 'admin@domain.com', password 'fluff'
9. goto Site page and edit as needed

Install on Heroku:

1. steps 2 and 3 above
2. edit defaults.js: app_service is 'Heroku', db service is 'MongoLab', initialize is true
3. create a new app on Heroku and get the MongoLab addon
4. push to heroku
5. open the Heroku app url in your browser
6. steps 8 and 9 above

Admin guide:

- the Pages tab manages pages. Each page must use a view template. Hit Esc to toggle full screen edit view.
- the Views tab manages view templates. Just drop {{content}} into any template, right where you want the page content to render. That is the extent of the page design tools. Let the multitude of Javascript UI toolkits do the rest; that's what they're there for.
- the Vars tab manages custom variables. Vars are an easy way to manage strings you use often. Drop {{var.[name]}} into any page or view, where [name] is the name of the var.
- the Users tab manages all users including admins. The 'Admin' role can access everything; the 'User' role cannot access the Admin app or pages with access restricted to admins.
- the Site tab manages site-wide configuration. Some of these settings can be accessed form within a page. The following tags are available: {{site.name}}, {{site.url}}, {{site.domain}}, {{site.protocol}}, {{site.admin_path}}

REST API:

See the [API_README.md](API_README.md) for a list of APIs.

To do:

- user/admin restrictions on all APIs
- move session timeout to be user specific
- add alert API and basic alert cases like initializing
- manage email templates
- manage error pages

Would be nice:

- record which user created each page, view, var
- page versioning
- add a model manager like django to replace vars
- multiple sites per admin (will require rethink of config loader)
