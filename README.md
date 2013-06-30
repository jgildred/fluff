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
- add alert API and basic alert cases like initializing
- enforce page status
- enforce page access
- enforce account status
- enforce API key requirement on API calls
- move session timeout to be user specific

Would be nice:

- record which user created each page, view, var
- possibly add page versioning
- possibly add a model manager like django
- possibly add ability to edit error pages

REST API:

  GET [admin path]/api/auth     
  GET [admin path]/api/auth/:id 
  POST[admin path]/api/auth 
  PUT [admin path]/api/auth/:id
  DELETE [admin path]/api/auth/:id

  GET [admin path]/api/users  
  GET [admin path]/api/users/:id
  POST[admin path]/api/users
  PUT [admin path]/api/users/:id
  PUT [admin path]/api/verify/:token
  DELETE [admin path]/api/users/:id

  GET [admin path]/api/sites 
  GET [admin path]/api/sites/:id 
  PUT [admin path]/api/sites/:id ;} );

  GET [admin path]/api/pages 
  GET [admin path]/api/pages/:id 
  POST[admin path]/api/pages
  PUT [admin path]/api/pages/:id 
  DELETE [admin path]/api/pages/:id

  GET [admin path]/api/views 
  GET [admin path]/api/views/:id
  POST[admin path]/api/views  
  PUT [admin path]/api/views/:id 
  DELETE [admin path]/api/views/:id 

  GET [admin path]/api/vars 
  GET [admin path]/api/vars/:id 
  POST[admin path]/api/vars  
  PUT [admin path]/api/vars/:id
  DELETE [admin path]/api/vars/:id 
  