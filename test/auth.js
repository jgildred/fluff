
var request  = require('supertest'),
    app      = require('../app');
var mongoose = require('mongoose'),
    db_name  = 'fluff-test-' + app.randomString(5);

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

describe('POST /fluff/admin/api/auth', function() {
	it('responds with json', function(done){
    request(app.Server)
      .post('/fluff/admin/api/auth')
      .send({'email':'admin@domain.com', 'password':'fluff'})
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res){
      	if (err) return done(err);
      	res.body.should.have.property('auth', true);
        res.body.user.should.have.property('email', 'admin@domain.com');
        done();
      });
  })
})

describe.skip('GET /fluff/admin/api/users', function() {
  it('responds with json', function(done){
    request(app.App)
      .get('/user')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res){
      	if (err) return done(err);
        res.body.should.have.property('name','tobi');
        done();
      });
  })
})