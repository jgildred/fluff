fluff
=====

The CMS that stays out of your way.

Installation:

1. install nodejs and MongoDB first
2. clone the repo or download the package
3. cd to the root dir of the app
4. npm install
5. edit defaults.js for Heroku or custom setup
6. open http://localhost:3000/admin

Admin guide:

- Pages tab manages pages. Each page must use a view template.
- Views tab manages view templates. Just drop {{content}} into any template, right where you want the page content to render. That is the extent of the page design tools. Let the multitude of Javascript UI toolkits do the rest; that's what they're there for.
- Vars tab manages custom variables. Vars are an easy way to manage strings you use often. Drop {{var.[name]}} into any page or view, where [name] is the name of the var.
- Users tab manages all users including admins. The 'Admin' role can access everything; the 'User' role cannot access the Admin app or pages with access restricted to admins.
- Site tab manages site-wide configuration. Some of these settings can be accessed form within a page. The following tags are available: {{site.name}}, {{site.url}}, {{site.domain}}, {{site.protocol}}, {{site.admin_path}}

REST API:

See the [API_README.md](API_README.md) for a list of APIs.

To do:

- move session timeout to be user specific
- add alert API and basic alert cases like initializing

Would be nice:

- record which user created each page, view, var
- page versioning
- add ability to edit error pages
- add a model manager like django
- multiple sites per admin
