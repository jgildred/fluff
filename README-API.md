Fluff REST API
==============

API paths must be preceded by [fluff path]/admin/api.
If API key is required, you must use X-API-Key header.
POST, PUT, and DELETE usually requires X-CSRF-Token header.

Authentication:
- GET    /auth
- GET    /auth/:id
- POST   /auth
- PUT    /auth/:id
- DELETE /auth/:id

Users:
- GET    /users
- GET    /users/info
- GET    /users/:id
- POST   /users
- PUT    /users/:id
- PATCH  /users/:id
- PUT    /verify/:token
- DELETE /users/:id

Site:
- GET   /site
- PUT   /site
- PATCH /site

Pages:
- GET    /pages
- GET    /pages/info
- GET    /pages/:id
- POST   /pages
- PUT    /pages/:id
- PATCH  /pages/:id
- DELETE /pages/:id

Views:
- GET    /views
- GET    /views/info
- GET    /views/:id
- POST   /views
- PUT    /views/:id
- PATCH  /views/:id
- DELETE /views/:id

Vars:
- GET    /vars
- GET    /vars/info
- GET    /vars/:id
- POST   /vars
- PUT    /vars/:id
- PATCH  /vars/:id
- DELETE /vars/:id

Models:
- GET    /models
- GET    /models/info
- GET    /models/:id
- POST   /models
- PUT    /models/:id
- PATCH  /models/:id
- DELETE /models/:id

Models you create:
These paths must be preceded by [fluff path]/api.
- GET    /[model name]
- GET    /[model name]/info
- GET    /[model name]/:id
- GET    /[model name]/count
- POST   /[model name]
- POST   /[model name]/import
- PUT    /[model name]/:id
- PATCH  /[model name]/:id
- DELETE /[model name]/:id
