
//
// This is the Fluff UI module for simple management of
// user signup, login, password reset, user profile and basic alerts
//
// fluff.js is required by this library
//

if (Fluff) {
	Fluff.ui.version = "0.5";

	Fluff.ui.loginModalTemplate = ' \
	<div class="modal" tabindex="-1" role="dialog" aria-hidden="true"> \n\
	  <div class="modal-dialog"> \n\
	    <div class="modal-content"> \n\
	      <div class="modal-body"> \n\
	        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \n\
	        <form auth role="form" id="fluff-login" class="login-form form-horizontal"> \n\
	          <br/> \n\
	          <h2 message class="text-center">Welcome back.</h2> \n\
	          <br/><br/> \n\
	          <div class="form-group"> \n\
	          	<div class="col-lg-2"></div> \n\
		          <div class="col-lg-8"> \n\
		            <div class="alert alert-info hidden" role="alert" aria-hidden="true"> \n\
		        			<span error-message class="alert-msg"></span> \n\
		      			</div> \n\
			          <input type="email" name="email" class="form-control" placeholder="Email" /> \n\
			          <br/> \n\
			          <input type="password" name="password" class="form-control" placeholder="Password" /> \n\
			          <br/> \n\
			          <button type="button" class="btn btn-lg btn-primary pull-right" onclick="Fluff.views[\'form#fluff-login\'].submit()">LOGIN</button> \n\
			          <div class="pull-left login-options"> \n\
			            <a href="javascript:Fluff.ui.signup();">Sign Up</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; \n\
			            <a href="javascript:Fluff.ui.pwreset();">Forgot Password</a> \n\
			          </div> \n\
			          <br/><br/><br/> \n\
		          </div> \n\
		          <div class="col-lg-2"></div> \n\
	          </div> \n\
	        </form> \n\
	      </div> \n\
	    </div> \n\
	  </div> \n\
	</div> \n\
	';

	Fluff.ui.signupModalTemplate = ' \
	<div class="modal" tabindex="-1" role="dialog" aria-hidden="true"> \n\
	  <div class="modal-dialog"> \n\
	    <div class="modal-content"> \n\
        <div class="modal-body"> \n\
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \n\
          <div class="alert hide alert-fail"> \n\
		        <span error-message class="alert-msg"></span> \n\
		      </div> \n\
          <form model="users" role="form" id="fluff-signup" class="form-horizontal"> \n\
            <br/> \n\
            <h2 message>Let\'s get started.</h2> \n\
            <br/> \n\
            <input type="email" name="email" class="form-control" placeholder="Enter your email." /> \n\
            <br/> \n\
            <input type="password" name="password" class="form-control" placeholder="Choose a password." /> \n\
            <br/> \n\
            <input type="password" name="confirmPassword" class="form-control" placeholder="Type your password again." /> \n\
            <br/> \n\
            <div id="captcha_container" class="captcha pull-left"> \n\
				      <div id="recaptcha_widget" style="display:none"> \n\
				        <div id="recaptcha_image" class="captcha_image"></div> \n\
				        <div class="recaptcha_only_if_incorrect_sol" style="color:red">Incorrect please try again</div> \n\
				        <input type="text" class="form-control" id="recaptcha_response_field" name="recaptcha_response_field" placeholder="Enter the characters you see in the image." /> \n\
				      </div> \n\
					  </div> \n\
					  <br/><br/><br/> \n\
            <button type="button" class="btn btn-lg btn-primary pull-right" onclick="Fluff.views[\'form#fluff-signup\'].submit()">SIGN UP</button> \n\
            <br/><br/><br/> \n\
          </form> \n\
        </div> \n\
      </div> \n\
	  </div> \n\
	</div> \n\
	';

	Fluff.ui.pwresetModalTemplate = ' \
  <div class="modal" tabindex="-1" role="dialog" aria-hidden="true"> \n\
	  <div class="modal-dialog"> \n\
		  <div class="modal-content"> \n\
		    <div class="modal-body"> \n\
		      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \n\
		      <div class="alert hide alert-fail"> \n\
		        <span error-message class="alert-msg"></span> \n\
		      </div> \n\
		      <form class="pwreset-form form-horizontal"> \n\
		      	<br/> \n\
		      	<h2 message class="text-center" id="pwresetModalLabel">Password Reset</h2> \n\
		     		<br/> \n\
		        <div class="form-group"> \n\
		          <label class="control-label col-lg-4" for="inputEmail">Email</label> \n\
		          <div class="col-lg-6"> \n\
		            <input type="email" class="form-control col-lg-4" id="inputEmail" name="email" placeholder="" required /> \n\
		            <br/><br/><br/> \n\
		            <button type="submit" class="btn btn-lg btn-primary pwreset">Request reset</button> \n\
		          </div> \n\
		        </div> \n\
		      </form> \n\
		    </div> \n\
		  </div> \n\
	  </div> \n\
  </div> \n\
	';

	Fluff.ui.pwchangeModalTemplate = ' \
  <div class="modal" tabindex="-1" role="dialog" aria-hidden="true"> \n\
    <div class="modal-dialog"> \n\
	    <div class="modal-content"> \n\
	      <div class="modal-body"> \n\
	        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \n\
	        <div class="alert hidden alert-fail"> \n\
	          <span error-message class="alert-msg"></span> \n\
	        </div> \n\
	        <form class="pwchange-form form-horizontal"> \n\
	          <br/> \n\
	          <h2 message class="text-center" id="pwchangeModalLabel">Change your password.</h2> \n\
	          <br/> \n\
	          <div class="form-group"> \n\
	            <label class="control-label col-lg-4" for="inputPassword">New Password</label> \n\
	            <div class="col-lg-6"> \n\
	              <input type="password" class="form-control" id="inputPassword" name="password" placeholder="" /> \n\
	            </div> \n\
	          </div> \n\
	          <div class="form-group"> \n\
	            <label class="control-label col-lg-4" for="inputConfirmPassword">Confirm</label> \n\
	            <div class="col-lg-6"> \n\
	              <input type="password" class="form-control" id="inputConfirmPassword" name="confirmPassword" placeholder="" /> \n\
	              <input type="hidden" name="token" /> \n\
	          		<br/><br/><br/> \n\
	            	<button type="submit" class="btn btn-lg btn-primary pwchange">Save and login</button> \n\
	            </div> \n\
	          </div> \n\
	        </form> \n\
	      </div> \n\
	    </div> \n\
    </div> \n\
  </div> \n\
	';

	Fluff.ui.profileModalTemplate = ' \
	<div class="modal" tabindex="-1" role="dialog" aria-hidden="true"> \n\
	  <div class="modal-dialog"> \n\
	    <div class="modal-content"> \n\
	        <div class="modal-body"> \n\
	          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \n\
	          <div class="alert hide alert-fail"> \n\
	          	<span error-message class="alert-msg"></span> \n\
	        	</div> \n\
	          <form role="form" id="fluff-profile" class="form-horizontal"> \n\
	            <br/> \n\
	            <h2 message>Your Profile Info</h2> \n\
	            <br/> \n\
	            <input type="email" field="email" name="email" class="form-control" placeholder="Email" /> \n\
	            <br/> \n\
	            <div class="pull-left login-options"> \n\
	            	<a pwchange href="">Change Password</a> \n\
	          	</div> \n\
	            <br/> \n\
	            <button type="button" class="btn btn-lg btn-primary pull-right" onclick="Fluff.views[\'form#fluff-profile\'].submit()">UPDATE</button> \n\
	            <br/><br/><br/> \n\
	          </form> \n\
	        </div> \n\
	      </div> \n\
	  </div> \n\
	</div> \n\
	';

	Fluff.ui.alertModalTemplate = ' \
	<div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true"> \n\
	  <div class="modal-dialog"> \n\
	    <div class="modal-content"> \n\
	      <div class="modal-body"> \n\
	          <h3 message class="text-center"></h3> \n\
	      </div> \n\
	    </div> \n\
	  </div> \n\
	</div> \n\
	';

	Fluff.ui.userlabelTemplate = function(name) {
		return '<i class="glyphicon glyphicon-user"></i> ' + name;
	};

	// This is called by fluff.js upon fluff init
	Fluff.ui.init = function (options) {
		$('[onauth]').hide();
		$('[noauth]').show();
		// Load the templates, eventually will make non-modal versions as well
		$('[fluff-login],[fluff-login-modal]').append(Fluff.ui.loginModalTemplate);
		$('[fluff-signup],[fluff-signup-modal]').append(Fluff.ui.signupModalTemplate);
		$('[fluff-pwreset],[fluff-pwreset-modal]').append(Fluff.ui.pwresetModalTemplate);
		$('[fluff-pwchange],[fluff-pwchange-modal]').append(Fluff.ui.pwchangeModalTemplate);
		$('[fluff-profile],[fluff-profile-modal]').append(Fluff.ui.profileModalTemplate);
		$('[fluff-alert],[fluff-alert-modal]').append(Fluff.ui.alertModalTemplate);
		// Hide elements that require login
	  // Check to see if already logged in
	  Fluff.checkSession({
			// Check session should always succeed unless server/network is down
	    success: function () {
	      if (Fluff.session.get('user')) {
	      	$('[fluff-userlabel]').html(Fluff.ui.userlabelTemplate(Fluff.session.get('user').displayname));
	      	$('[onauth]').show();
	      	$('[noauth]').hide();
	      }
	    	if (Fluff.session.get('site')) {
	    		// Setup for captcha if necessary
	    		if (Fluff.session.get('site').captcha && Fluff.session.get('site').captcha.required) {
		      	var script = document.createElement('script');
						script.type = 'text/javascript';
						//script.src = 'https://www.google.com/recaptcha/api/challenge?k=' + Fluff.session.get('site').captcha.recaptcha_key;
						$("body").append(script);
	    		}
	    		else {
	    			$('#captcha_container').remove();
	    		}
	      }
	    }
	  });
	  // Setup the login view
	  Fluff.harvestLogins({
	  	callback: Fluff.ui._login_setup
	  });
	  // Setup the signup view
	  Fluff.harvestForms({
	  	callback: Fluff.ui._signup_setup
	  })
	};

	// Function for login using the UI
  Fluff.ui.login = function (options) {
  	Fluff.ui.logout();
  	// Reset the login behavior
  	Fluff.ui._login_setup(options);
  	$('.modal').modal('hide');
    var el = $('[fluff-login], [fluff-login-modal]');
    el.find('.modal').modal('show');
    // If an email was passed in the URL, then include it
    var emailInput = el.find('input[name=email]');
    emailInput.val((options && options.email) ? options.email : '');
    emailInput.focus();
	};

	Fluff.ui.logout = function (options) {
		if (Fluff.session.get('user')) {
  		Fluff.session.logout();
  		Fluff.log("Logged out.");
  	}
		$('[onauth]').hide();
    $('[noauth]').show();
    $('.modal').modal('hide');
	};

	// Function for signup using the UI
	Fluff.ui.signup = function (options) {
		$('.modal').modal('hide');
		var el = $('[fluff-signup], [fluff-signup-modal]');
		el.find('input[type=password]').val('');
    el.find('.modal').modal('show');
    el.find('input[name=email]').focus();
  };

  // Function for email verification using the UI
  Fluff.ui.verify = function (options) {
 		if (options && options.token) {
 			Fluff.verifyEmail({
 				token: options.token,
 				success: function (data, status, xhr) {
 					Fluff.ui.alert('Your email has been verified.');
 				},
 				error: function (xhr) {
 					var msg = "Couldn't verify, check your connection.";
			  	if (xhr) {
				  	msg = Fluff.responseErrorMsg(xhr, {
				  		401: "Verify failed, token may be invalid.",
				  		default: msg
				  	});
					}
					Fluff.ui.alert(msg);
 				}
 			});
 		}
		else {
			Fluff.ui.alert('The token is missing in the URL.');
		}
  };

  // Function for requesting password reset using the UI
  Fluff.ui.pwreset = function (options) {
  	$('.modal').modal('hide');
		var el = $('[fluff-pwreset], [fluff-pwreset-modal]');
		el.find('.modal').modal('show');
		var emailInput = el.find('input[name=email]');
    emailInput.val((options && options.email) ? options.email : '').focus();
    el.find('form').submit(function (event) {
	 		if (emailInput.val() != '') {
	 			Fluff.passwordReset({
	 				email: emailInput.val(),
	 				success: function (data, status, xhr) {
	 					Fluff.ui.alert('Check you email for further instructions.');
	 				},
	 				error: function (xhr) {
	 					var msg = "Couldn't request reset, check your connection.";
				  	if (xhr) {
					  	msg = Fluff.responseErrorMsg(xhr, {
					  		401: "Request failed, please try again.",
					  		default: msg
					  	});
						}
						// Show the alert message
	  				el.find('[error-message]').text(msg);
      			el.find('.alert').removeClass('hidden');
	 				}
	 			});
	 		}
			else {
				// Show the alert message
				var msg = "Email is missing.";
	  		el.find('[error-message]').text(msg);
      	el.find('.alert').removeClass('hidden');
			}
			return false;
    });
  };

  // Function for password change using the UI
  Fluff.ui.pwchange = function (options) {
  	$('.modal').modal('hide');
		if (options && options.token) {
			var el = $('[fluff-pwchange], [fluff-pwchange-modal]');
			el.find('input[type=password]').val();
			el.find('input[name=token]').val(options.token);
	    el.find('.modal').modal('show');
	    el.find('input[name=password]').focus();
	    el.find('form').submit(function (event) {
	    	// Go through all the possible password issues
		 		if (el.find('input[name=password]').val() != '') {
		 			if (el.find('input[name=confirmPassword]').val() != '') {
		 				if (el.find('input[name=password]').val() == el.find('input[name=confirmPassword]').val()) {
				 			Fluff.passwordChange({
				 				token: options.token,
				 				password: el.find('input[name=password]').val(),
				 				success: function (data, status, xhr) {
				 					Fluff.ui.alert('Your password has been updated.');
				 				},
				 				error: function (xhr) {
				 					var msg = "Couldn't set password, check your connection.";
							  	if (xhr) {
								  	msg = Fluff.responseErrorMsg(xhr, {
								  		401: "Request failed, please try again.",
								  		default: msg
								  	});
									}
									// Show the alert message
				  				el.find('[error-message]').text(msg);
			      			el.find('.alert').removeClass('hidden');
				 				}
				 			});
		 				}
		 				else {
		 					// Show the alert message
							var msg = "Password do not match.";
		  				el.find('[error-message]').text(msg);
	      			el.find('.alert').removeClass('hidden');
		 				}
		 			}
		 			else {
		 				// Show the alert message
						var msg = "Please confirm the password.";
		  			el.find('[error-message]').text(msg);
	      		el.find('.alert').removeClass('hidden');
		 			}
		 		}
		 		else {
		 			// Show the alert message
					var msg = "Please enter a password.";
		  		el.find('[error-message]').text(msg);
	      	el.find('.alert').removeClass('hidden');
		 		}
				return false;
	    });
		}
		else {
			Fluff.ui.alert('The token is missing in the URL.');
		}
  };

  // Function for editing user profile using the UI
  Fluff.ui.profile = function (options) {
  	if (!Fluff.session.get('user')) {
		  Fluff.ui.login({
		  	callback: function () {
		  		Fluff.ui.profile(options);
		  	}
		  });
  	}
  	else {
	    var el = $('[fluff-profile], [fluff-profile-modal]');
	    $('.modal').modal('hide');
	    var form = el.find('form');
	    // Put in the correct model and ID set for harvesting
	    form.attr('model', 'users/' + Fluff.session.get('user').id);
	    Fluff.harvestForms({
	    	form: '[fluff-profile] form[model],[fluff-profile-modal] form[model]',
	    	callback: function () {
	    		var user = Fluff.views['form#fluff-profile'].model;
	    		// Put the token in the password change link
	    		form.find('a[pwchange]').attr('href', 'javascript:Fluff.ui.pwchange({token:\'' + user.get('verifytoken') + '\'});');
	    		el.find('.modal').modal('show');
	    		el.find('input[name=email]').focus();
	    	}
	    });
  	}
	};

	// Function for displaying alerts using the UI
	Fluff.ui.alert = function (message, options) {
		$('.modal').modal('hide');
		var el = $('[fluff-alert], [fluff-alert-modal]');
		el.find('[message]').html(message);
		el.find('.modal').modal('show');
    if (options) {
    	if (options.wait) {
	    	setTimeout(function () {
	        el.find('.modal').modal('hide');
	        if (options.callback) {
	    			options.callback();
	    		}
	      }, options.wait * 1000);
			}
			else {
				if (options.callback) {
    			options.callback();
    		}
			}
    } 
  };

	Fluff.ui._login_setup = function (options) {
	  var view = Fluff.views['form#fluff-login'];
		if (view) {
		  // This happens on successful login
		  view.success = function (model) {
		    $('[noauth]').hide();
		    $('[fluff-userlabel]').html(Fluff.ui.userlabelTemplate(Fluff.session.get('user').displayname));
		    $('.modal').modal('hide');
		    var el = $('[fluff-login], [fluff-login-modal]');
		    // Hide the alert message
		    el.find('.alert').addClass('hidden');
		    // Clear the password field
		    el.find('input[name=password]').val('');
		    $('[onauth]').fadeIn();
		    if (options && options.callback) {
		    	options.callback();
		    }
		  };
		  view.error = function (model, xhr) {
		  	var msg = "Couldn't login, check your connection.";
		  	if (xhr) {
			  	msg = Fluff.responseErrorMsg(xhr, {
			  		401: "Login failed, please try again.",
			  		default: msg
			  	});
				}
		  	var el = $('[fluff-login], [fluff-login-modal]');
		  	// Show the alert message
		  	el.find('[error-message]').text(msg);
	      el.find('.alert').removeClass('hidden');
	    	// Clear the password field and put in focus
	    	el.find('input[type=password]').val('').focus();
		  };
	  }
	};

	Fluff.ui._signup_setup = function (options) {
	  var view = Fluff.views['form#fluff-signup'];
	  if (view) {
		  // This happens on successful signup
		  view.success = function (model) {
		    $('.modal').modal('hide');
		    var el = $('[fluff-signup], [fluff-signup-modal]');
		    // Hide the alert message
		    el.find('.alert').addClass('hidden');
		    // Clear the password fields
		    el.find('input[type=password]').val('');
		    Fluff.ui.alert('Check your email to complete setup.');
		    if (options && options.callback) {
		    	options.callback();
		    }
		  };
		  view.error = function (model, xhr) {
		  	var msg = "Couldn't signup, check your connection.";
		  	if (xhr) {
			  	msg = Fluff.responseErrorMsg(xhr, {
			  		401: "The captcha was invalid, please try again.",
			  		default: msg
			  	});
				}
				if (Recaptcha) {
					Recaptcha.reload();
		  		Recaptcha.focus_response_field();
				}
		  	var el = $('[fluff-signup], [fluff-signup-modal]');
		  	el.find('[error-message]').text(msg);
		  	el.find('.alert').removeClass('hidden');
		  	el.find('input')[0].focus();
		  };
	  }
	};

	Fluff.ui._pwreset_setup = function (options) {
	  var view = Fluff.views['form#fluff-pwreset'];
		if (view) {
		  // This happens on successful reset request
		  view.success = function (model) {
		  	$('.modal').modal('hide');
		    var el = $('[fluff-pwreset], [fluff-pwreset-modal]');
		    // Hide the alert message
		    el.find('.alert').addClass('hidden');
		    // Clear the email field
		    el.find('input[name=email]').val('');
		    if (options && options.callback) {
		    	options.callback();
		    }
		  };
		  view.error = function (model, xhr) {
		  	var msg = "Couldn't send request, check your connection.";
		  	if (xhr) {
			  	msg = Fluff.responseErrorMsg(xhr, {
			  		401: "Request failed, please try again.",
			  		default: msg
			  	});
				}
		  	var el = $('[fluff-pwreset], [fluff-pwreset-modal]');
		  	el.find('[error-message]').text(msg);
	      el.find('.alert').removeClass('hidden');
		    el.find('input[name=email]').focus();
		  };
	  }
	};

	Fluff.ui._pwchange_setup = function (options) {
	  var view = Fluff.views['form#fluff-pwchange'];
	  if (view) {
		  // This happens on successful password change
		  view.success = function (model) {
		  	$('.modal').modal('hide');
		    var el = $('[fluff-pwchange], [fluff-pwchange-modal]');
		    // Hide the alert message
		    el.find('.alert').addClass('hidden');
		    // Clear the email field
		    el.find('input[name=email]').val('');
		    if (options && options.callback) {
		    	options.callback();
		    }
		  };
		  view.error = function (model, xhr) {
		  	var msg = "Couldn't change password, check your connection.";
		  	if (xhr) {
			  	msg = Fluff.responseErrorMsg(xhr, {
			  		401: "Change failed, please try again.",
			  		default: msg
			  	});
				}
		  	var el = $('[fluff-pwchange], [fluff-pwchange-modal]');
		  	el.find('[error-message]').text(msg);
	      el.find('.alert').removeClass('hidden');
		    el.find('input[name=email]').focus();
		  };
	  }
	};

  // Map an event to each route
	var Router = Backbone.Router.extend({
	    routes: {
	      "profile"         : "profile",
	      "signup"          : "signup",
	      "signup/:email"   : "signup",
	      "login"           : "login",
	      "login/:email"    : "login",
	      "logout"          : "logout",
	      "pwreset"         : "pwreset",
	      "pwreset/:email"  : "pwreset",
	      "pwchange"        : "pwchange",
	      "pwchange/:token" : "pwchange",
	      "verify/:token"   : "verify"
	    }
	});

	// Setup the behavior for each route event
	var router = new Router;
	router.on('route:profile', function() {
		Fluff.ui.profile();
	});
	router.on('route:signup', function(email) {
		Fluff.ui.signup({email: email});
	});
	router.on('route:login', function(email) {
		Fluff.ui.login({
			email: email,
			callback: function() {router.navigate('/')}
		});
	});
	router.on('route:logout', function() {
		Fluff.ui.logout();
	});
	router.on('route:pwreset', function(email) {
		Fluff.ui.pwreset({email: email});
	});
	router.on('route:pwchange', function(token) {
		Fluff.ui.pwchange({token: token});
	});
	router.on('route:verify', function(token) {
		Fluff.ui.verify({token: token});
	});

	// Setup captcha if needed
	var RecaptchaOptions = {
	  theme : 'custom',
	  custom_theme_widget: 'recaptcha_widget'
	};
}
else {
	Fluff.log('fluff.js must be loaded before fluff-ui.js');
}


