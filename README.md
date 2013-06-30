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

To do:
- fix cors whitelist in site edit view
- user password change in admin
- check for data before init db
- add alert API and basic alert cases
- enforce page status
- enforce page access
- enforce account status
- enforce API key requirement on API calls
- move session timeout to be user specific
- record which user created each page, view, var
- possibly add page versioning
