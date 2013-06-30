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

REST API:

See the [API_README.md](API_README.md) for a list of APIs.

To do:

- fix cors whitelist in site edit view
- user password change in admin
- check for data before init db
- add alert API and basic alert cases like initializing
- enforce page status
- enforce page access
- enforce account status
- enforce API key requirement on API calls
- move session timeout to be user specific

Would be nice:

- record which user created each page, view, var
- page versioning
- add a model manager like django
- add ability to edit error pages
