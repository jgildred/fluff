fluff REST API
==============

All API urls must be preceded by '[fluff path]/admin/api'.
If API key is required, you must use X-API-Key header.
POST, PUT, and DELETE usually requires X-CSRF-Token header.

Authentication:
- GET /auth
- GET /auth/:id
- POST /auth
- PUT /auth/:id
- DELETE /auth/:id

Users:
- GET /users
- GET /users/:id
- POST /users
- PUT /users/:id
- PUT /verify/:token
- DELETE /users/:id

Sites:
- GET /sites
- GET /sites/:id
- PUT /sites/:id

Pages:
- GET /pages
- GET /pages/:id
- POST /pages
- PUT /pages/:id
- DELETE /pages/:id

Views:
- GET /views
- GET /views/:id
- POST /views
- PUT /views/:id
- DELETE /views/:id

Vars:
- GET /vars
- GET /vars/:id
- POST /vars
- PUT /vars/:id
- DELETE /vars/:id

Models:
- GET /models
- GET /models/:id
- POST /models
- PUT /models/:id
- DELETE /models/:id

Models you create:
- GET /[model name]
- GET /[model name]/:id
- GET /[model name]/info
- GET /[model name]/count
- POST /[model name]
- POST /[model name]/import
- PUT /[model name]/:id
- DELETE /[model name]/:id
