
// BASIC TESTS FOR FLUFF

var app      = require('../app'),
    Fluff    = app.Fluff,
    mongoose = require('mongoose'),
    request  = require('supertest'),
    should   = require('should'),
    db_name  = 'fluff-test-' + app.randomString(5),
    cookie, csrf,
    user_id, view_id, page_id, var_id, model_id;

// This runs before all tests
before(function (done) {
	var custom_config = {
  	db_uri      : 'mongodb://localhost:27017/' + db_name
	};
	app.launch(custom_config, done);
});

// This runs after all tests
after(function (done) {
	mongoose.connection.db.dropDatabase(done);
});

// This runs before each test
beforeEach(function (done) {
  request(app.Server)
    .post('/fluff/admin/api/auth')
    .send({email:'admin@domain.com', password:'fluff'})
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(200)
    .end(function(err, res){
    	if (err) return done(err);
    	res.body.should.have.property('auth', true);
      res.body.user.should.have.property('email', 'admin@domain.com');
      cookie = res.header['set-cookie'];
    	csrf   = res.body._csrf;
      done();
    });
});

//
// GET tests
//

describe('GET /fluff/admin/api/site', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/site')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('domain_name');
        done();
      });
  });
});

describe('GET /fluff/admin/api/users', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/users')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
      	if (err) return done(err);
        res.body[0].should.have.property('email');
        user_id = res.body[0]._id;
        done();
      });
  });
});

describe('GET /fluff/admin/api/views', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/views')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body[0].should.have.property('template');
        view_id = res.body[0]._id;
        done();
      });
  });
});

describe('GET /fluff/admin/api/pages', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/pages')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body[0].should.have.property('content');
        page_id = res.body[0]._id;
        done();
      });
  });
});

describe('GET /fluff/admin/api/vars', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/vars')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body[0].should.have.property('value');
        var_id = res.body[0]._id;
        done();
      });
  });
});

describe('GET /fluff/admin/api/models', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .get('/fluff/admin/api/models')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body[0].should.have.property('schema_data');
        model_id = res.body[0]._id;
        done();
      });
  });
});

//
// PATCH tests
//

describe('PATCH /fluff/admin/api/site', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/site')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({domain_name:'domain.com'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('domain_name', 'domain.com');
        done();
      });
  });
});

describe('PATCH /fluff/admin/api/users/:id', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/users/' + user_id)
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({firstname:'George'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('firstname', 'George');
        done();
      });
  });
});

describe('PATCH /fluff/admin/api/views/:id', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/views/' + view_id)
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({name:'Changed Name'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('name', 'Changed Name');
        done();
      });
  });
});

describe('PATCH /fluff/admin/api/pages/:id', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/pages/' + page_id)
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({name:'Changed Name'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('name', 'Changed Name');
        done();
      });
  });
});

describe('PATCH /fluff/admin/api/vars/:id', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/vars/' + var_id)
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({name:'Changed Name'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('name', 'Changed Name');
        done();
      });
  });
});

describe('PATCH /fluff/admin/api/models/:id', function() {
  it('responds with json', function(done){
    request(Fluff.app)
      .patch('/fluff/admin/api/models/' + model_id)
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .send({name:'Changed Name'})
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        res.body.should.have.property('name', 'Changed Name');
        done();
      });
  });
});
