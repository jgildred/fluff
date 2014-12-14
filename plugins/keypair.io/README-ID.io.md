Keypair.io PLUGIN REST API
==========================

API paths must be preceded by [fluff_path]/api.
If API key is required, you must use X-API-Key header.
POST, PUT, and DELETE usually requires X-CSRF-Token header.

Identities:
- GET    /identities
- GET    /identities/:id      (returns data with pkcs5_pem)
- GET    /identities/:id/csr  (creates and returns csr but does not store it)
- GET    /identities/:id/crl  (returns crl pem)
- POST   /identities          (missing pkcs5_pem and status!=Empty will cause keygen using key_size and password)
- POST   /identities/import   (accepts csv file or array)
- PUT    /identities/:id      (cannot change pkcs5_pem)
- PUT    /identities/:id/pem       (accepts pkcs5_pem with password)
- PUT    /identities/:id/keygen    (accepts key_size with password)
- PUT    /identities/:id/pwchange  (requires old password)
- DELETE /identities/:id

Certificates:
- GET    /certificates
- GET    /certificates/:id        (returns data with pkcs8_pem)
- GET    /certificates/:id/chain  (returns the cert chain as an array of pkcs8_pem strings)
- GET    /identities/:id/certificates
- POST   /certificates            (missing pkcs8_pem and Status!=Revoked will cause cert generation using csr or tbs_cert_info and identity_id)
- POST   /identities/:id/certificates
- POST   /certificates/import                 (accepts csv file or array) 
- POST   /identities/:id/certificates/import  (accepts csv file or array)
- PUT    /certificates/:id
- DELETE /certificates/:id
