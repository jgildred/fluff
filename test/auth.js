
var request = require('supertest'),
    app     = require('../app'),
    //mongoose = require('mongoose'),
    db_uri  = 'mongodb://localhost:27017/fluff-test';

before(function (done) {
	var custom_config = {
		initialize  : true,
  	db_uri      : db_uri
	}
	//mongoose.connect(db_uri);
	//for (collection in mongoose.connection.collections) {
	//	mongoose.connection.collections[collection].drop(function(err) {
	//		app.launch(custom_config, done);
	//	});
	//}
	app.launch(custom_config, done);
})

after(function (done) {
	//drop again
	done();
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
      	console.log(res.header);
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