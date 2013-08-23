
var app      = require('../app');
var mongoose = require('mongoose'),
    request  = require('supertest'),
    db_name  = 'fluff-test-' + app.randomString(5),
    cookie,
    csrf;

before(function (done) {
	var custom_config = {
		initialize  : true,
  	db_uri      : 'mongodb://localhost:27017/' + db_name
	};
	app.launch(custom_config, done);
})

after(function (done) {
	mongoose.connection.db.dropDatabase(done);
})

beforeEach(function (done) {
  request(app.Server)
    .post('/fluff/admin/api/auth')
    .send({'email':'admin@domain.com', 'password':'fluff'})
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(200)
    .end(function(err, res){
    	if (err) return done(err);
    	//res.body.should.have.property('auth', true);
      //res.body.user.should.have.property('email', 'admin@domain.com');
      cookie = res.header['set-cookie'];
    	csrf   = res.body._csrf;
      done();
    });
})

describe('GET /fluff/admin/api/users', function() {
  it('responds with json', function(done){
    request(app.App)
      .get('/fluff/admin/api/users')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', cookie)
      .expect(200)
      .end(function(err, res){
      	if (err) return done(err);
        res.body[0].should.have.property('email');
        done();
      });
  })
})