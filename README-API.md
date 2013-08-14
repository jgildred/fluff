fluff REST API
==============

All API urls must be preceded by '[admin path]/api'.

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
