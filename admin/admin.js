// Helper functions
function htmlEncode(value){
  return $('<div/>').text(value).html();
}
$.fn.serializeObject = function() {
  var o = {};
var a = this.serializeArray();
  $.each(a, function() {
      if (o[this.name] !== undefined) {
          if (!o[this.name].push) {
              o[this.name] = [o[this.name]];
          }
          o[this.name].push(this.value || '');
      } else {
          o[this.name] = this.value || '';
      }
  });
  return o;
};

// on page load
function init () {
  
  switch (true) {
    case /#\/signup/i.test(window.location.href):
      loadnavbar();
      Backbone.history.start();
      break;
    case /#\/verify/i.test(window.location.href):
      loadnavbar();
      Backbone.history.start();
      break;
    default:
      session.fetch({
        success: function () {
          Backbone.history.start();
          if (!session.get('auth')) {
            loginView.render();
          }
        },
        error: function () {
          Backbone.history.start();
          loginView.render();
        }
      });
      break;
  }
}

// Set the nav bar item active based on id=[type]-tab
function navselect (type) {
  if (type) {
    // if the navbar is already loaded then just select the tab
    if ($(".navbar-inner li#" + type.toLowerCase() + "-tab").length > 0) {
      $("li.active").removeClass("active");
      $("li#" + type.toLowerCase() + "-tab").addClass("active");
    }
    else {
      loadnavbar(type);
    }
  }
}

// Load the navbar and authbar
function loadnavbar (selection) {
  var template = _.template($('#authbar-template').html(), {session: session});
  $(".authbar").html(template);
  var template = _.template($('#navbar-template').html(), {auth: session.get('auth'), admin: (session.get('role') == 'Admin')}); 
  $(".navbar-inner").html(template);
  if (selection) {
    navselect(selection);
  }
}

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

// Setup the models
var User = Backbone.Model.extend({
  urlRoot: apibase + '/users'
});
var Page = Backbone.Model.extend({
  urlRoot: apibase + '/pages'
});
var View = Backbone.Model.extend({
  urlRoot: apibase + '/views'
});
var Var = Backbone.Model.extend({
  urlRoot: apibase + '/vars'
});
var Session = Backbone.Model.extend({
  urlRoot: apibase + '/auth',
  initialize: function () {
    var that = this;
    // Hook into jquery
    // Use withCredentials to send the server cookies
    // The server must allow this through response headers
    $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
      options.xhrFields = { withCredentials: true };
      // If we have a csrf token send it through with the next request
      if(typeof that.get('_csrf') !== 'undefined') {
        jqXHR.setRequestHeader('X-CSRF-Token',
        that.get('_csrf'));
        // alert(that.get('_csrf'));
      }
    });
  },
  login: function(creds, callback) {
    // Do a POST to /auth and send the serialized form creds
    console.log("SAVING...");
    this.save(creds, {
      success: callback,
      error: callback
    });
  },
  logout: function() {
    // Do a DELETE to /auth and clear the clientside data
    var that = this;
    this.destroy({
      success: function (model, resp) {
        model.clear();
        model.id = null;
        // Set auth to false to trigger a change:auth event
        // The server also returns a new csrf token so that
        // the user can relogin without refreshing the page
        //that.set({'auth': false, '_csrf': resp._csrf});
        loginView.render();
      }
    });
  },
  getAuth: function(callback) {
    // getAuth is wrapped around our router
    // before we start any routers let us see if the user is valid
    //this.fetch({ success: callback });
    this.fetch({ 
      success: function(mode, resp) {
        //alert(JSON.stringify(resp));
      }
    });
  }
});

// Setup the collections
var Users = Backbone.Collection.extend({
  url: apibase + '/users'
});
var Pages = Backbone.Collection.extend({
  url: apibase + '/pages'
});
var Views = Backbone.Collection.extend({
  url: apibase + '/views'
});
var Vars = Backbone.Collection.extend({
  url: apibase + '/vars'
});
var Sites = Backbone.Collection.extend({
  url: apibase + '/sites'
});

// Setup the user list view
var UserListView = Backbone.View.extend({
  el: '.page',
  render: function () {
    var that = this;
    var users = new Users();
    users.fetch({
      success: function (users) {
        var template = _.template($('#user-list-template').html(), {users: users.models});
        that.$el.html(template);
      }
    })
  }
});

// Setup the page list view
var PageListView = Backbone.View.extend({
  el: '.page',
  render: function () {
    // first get the list of views for the page list view
    this.views = new Views();
    var that = this;
    this.views.fetch({
      success: function (views) {
        that.views = views ? views : [];
        // then get the list of pages
        that.pages = new Pages();
        that.pages.fetch({
          success: function (pages) {
            var template = _.template($('#page-list-template').html(), {pages: that.pages.models, views: that.views});
            that.$el.html(template);
          }
        });
      }
    });
  }
});

// Setup the view list view
var ViewListView = Backbone.View.extend({
  el: '.page',
  render: function () {
    var that = this;
    var views = new Views();
    views.fetch({
      success: function (views) {
        var template = _.template($('#view-list-template').html(), {views: views.models});
        that.$el.html(template);
      }
    })
  }
});

// Setup the var list view
var VarListView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-var-quickform'   : 'noSubmit',
    'change .edit-var-name'        : 'saveVar',
    'change .edit-var-value'       : 'saveVar',
    'click  .delete-var-quickform' : 'deleteVar'
  },
  noSubmit: function () {
    return false;
  },
  saveVar: function (ev) {
    var varDetails = $(ev.currentTarget).parents("form:first").serializeObject();
    this.var = this.vars.get(varDetails.id);
    if (!this.var) {
      this.var = new Var();
    }
    var that = this;
    this.var.save(varDetails, {
      success: function (vari) {
        console.log('var saved');
        that.render();
      }
    });
    //return false;
  },
  deleteVar: function (ev) {
    var that = this;
    alert(JSON.stringify(this.vars.get($(ev.currentTarget).attr('data-var-id'))));
    this.var = this.vars.get($(ev.currentTarget).attr('data-var-id'));
    this.var.destroy({
      success: function () {
        console.log('var destroyed');
        that.render();
      }
    })
  },
  render: function () {
    this.vars = new Vars();
    var that = this;
    this.vars.fetch({
      success: function (vars) {
        var template = _.template($('#var-list-template').html(), {vars: vars.models});
        that.$el.html(template);
      }
    })
  }
});

// Setup the signup view
var SignUpView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .signup-form': 'saveUser',
    'click .close'       : 'close'
  },
  saveUser: function (ev) {
    var userDetails = $(ev.currentTarget).serializeObject();
    var user = new User();
    user.save(userDetails, {
      success: function (user) {
        $('.modal-body').html($('.signup-step2').html());
      }
    });
    return false;
  },
  close: function () {
    window.history.back();
  },
  render: function (options) {
    var template = _.template($('#signup-template').html(), {user: null});
    this.$el.html(template);
    $('#signup-modal').modal('show');
  }
});

// Setup the login view
var LoginView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .login-form'  : 'login',
    'click  .close'       : 'close'
  },
  login: function (ev) {
    var loginDetails = $(ev.currentTarget).serializeObject();
    session.login(loginDetails, function () {
      if (session.get("auth")) {
        switch (session.get("status")) {
          case 'inactive':
            $('.alert-msg').html('This account has been deactivated.');
            $('.login-fail').show();
            break;
          case 'unverified':
            $('.alert-msg').html('Please check your email to verify.');
            $('.login-fail').show();
            break;
          default:
            $('#login-modal').modal('hide');
            router.navigate('pages', {trigger:true});
            loadnavbar();
            break;
        } 
      }
      else {
        $('.alert-msg').html('Login failed. Please try again.');
        $('.login-fail').show();
      }
    });
    return false;
  },
  close: function () {
    window.history.back();
  },
  render: function (options) {
    var template = $('#login-template').html();
    this.$el.html(template);
    $('#login-modal').modal('show');
  }
});

// Setup the user detail view
var UserDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-user-form': 'saveUser',
    'click .delete-user'    : 'deleteUser',
    'click .cancel'         : 'cancel'
  },
  saveUser: function (ev) {
    var userDetails = $(ev.currentTarget).serializeObject();
    if (this.user) {
      this.user.save(userDetails, {
        success: function (user) {
          session.fetch({
            success: function () {
              loadnavbar();
              window.history.back();
            },
            error: function () {
              loginView.render();
            }
          });
        }
      });
    }
    return false;
  },
  deleteUser: function (ev) {
    this.user.destroy({
      success: function () {
        console.log('user destroyed');
        window.history.back();
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  render: function (options) {
    // build the list of role options
    this.role_options = ['User', 'Admin'];
    // build the list of status options
    this.status_options = ['Active', 'Inactive', 'Unverified'];
    var that = this;
    if(options.id) {
      this.user = new User({_id: options.id});
      this.user.fetch({
        success: function (user) {
          var template = _.template($('#edit-user-template').html(), {user: user, role_options: that.role_options, status_options: that.status_options}); 
          that.$el.html(template);
        }
      })
    } else {
      this.user = null;
      var template = _.template($('#edit-user-template').html(), {user: this.user, role_options: this.role_options, status_options: this.status_options});
      this.$el.html(template);
    }
  }
});

// Setup the page detail view
var PageDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-page-form' : 'savePage',
    'click  .delete-page'    : 'deletePage',
    'click  .cancel'         : 'cancel'
  },
  savePage: function (ev) {
    var pageDetails = $(ev.currentTarget).serializeObject();
    if (!this.page) {
      this.page = new Page();
    }
    this.page.save(pageDetails, {
      success: function (page) {
        console.log('page saved');
        window.history.back();
      }
    });
    return false;
  },
  deletePage: function (ev) {
    this.page.destroy({
      success: function () {
        console.log('page destroyed');
        window.history.back();
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  render: function (options) {
    // first get the list of views for the edit page view
    this.views = new Views();
    // build the list of access options
    this.access_options = ['Public', 'Users', 'Admins'];
    // build the list of status options
    this.status_options = ['Published', 'Unpublished'];
    var that = this;
    this.views.fetch({
      success: function (views) {
        that.views = views ? views : [];
        if(options.id) {
          // then get the page details
          that.page = new Page({_id: options.id});
          that.page.fetch({
            success: function (page) {
              var template = _.template($('#edit-page-template').html(), {page: page, views: that.views, access_options: that.access_options, status_options: that.status_options});
              that.$el.html(template);
            }
          });
        } else {
          that.page = null;
          var template = _.template($('#edit-page-template').html(), {page: that.page, views: that.views, access_options: that.access_options, status_options: that.status_options});
          that.$el.html(template);
        }
      }
    });
  }
});

// Setup the view detail view
var ViewDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-view-form' : 'saveView',
    'click  .delete-view'    : 'deleteView',
    'click  .cancel'         : 'cancel'
  },
  saveView: function (ev) {
    var viewDetails = $(ev.currentTarget).serializeObject();
    if (!this.view) {
      this.view = new View();
    }
    this.view.save(viewDetails, {
      success: function (view) {
        console.log('view saved');
        window.history.back();
      }
    });
    return false;
  },
  deleteView: function (ev) {
    this.view.destroy({
      success: function () {
        console.log('view destroyed');
        window.history.back();
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  render: function (options) {
    var that = this;
    if(options.id) {
      this.view = new View({_id: options.id});
      this.view.fetch({
        success: function (view) {
          var template = _.template($('#edit-view-template').html(), {view: view}); 
          that.$el.html(template);
        }
      })
    } else {
      this.view = null;
      var template = _.template($('#edit-view-template').html(), {view: this.view});
      this.$el.html(template);
    }
  }
});

// Setup the var detail view
var VarDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-var-form' : 'saveVar',
    'click  .delete-var'    : 'deleteVar',
    'click  .cancel'         : 'cancel'
  },
  saveVar: function (ev) {
    var varDetails = $(ev.currentTarget).serializeObject();
    if (!this.var) {
      this.var = new Var();
    }
    this.var.save(varDetails, {
      success: function (vari) {
        console.log('var saved');
        window.history.back();
      }
    });
    return false;
  },
  deleteVar: function (ev) {
    this.var.destroy({
      success: function () {
        console.log('var destroyed');
        window.history.back();
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  render: function (options) {
    var that = this;
    if(options.id) {
      this.var = new Var({_id: options.id});
      this.var.fetch({
        success: function (vari) {
          var template = _.template($('#edit-var-template').html(), {vari: vari}); 
          that.$el.html(template);
        }
      })
    } else {
      this.var = null;
      var template = _.template($('#edit-var-template').html(), {vari: this.var});
      this.$el.html(template);
    }
  }
});

// Setup the site detail view
var SiteDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-site-form' : 'saveSite',
    'click  .cancel'         : 'cancel'
  },
  saveSite: function (ev) {
    var siteDetails = $(ev.currentTarget).serializeObject();
    if (!this.site) {
      this.site = new Site();
    }
    this.site.save(siteDetails, {
      success: function (site) {
        console.log('site saved');
        alertView.render({label:"Config changed", msg: "Changes are effective immediately."});
      }
    });
    return false;
  },
  cancel: function() {
    window.history.back();
  },
  render: function () {
    // build the list of cors mode options
    this.cors_mode_options = ['Allow All', 'White List'];
    // build the list of smtp service options
    this.smtp_service_options = ['Gmail'];
    var that = this;
    if (!this.site) {
      var sites = new Sites();
      sites.fetch({
        success: function (sites) {
          that.site = sites.models[0];
          var template = _.template($('#edit-site-template').html(), {site: that.site, cors_mode_options: that.cors_mode_options, smtp_service_options: that.smtp_service_options});
          that.$el.html(template);
        }
      })
    } else {
      var template = _.template($('#edit-site-template').html(), {site: this.site, cors_mode_options: this.cors_mode_options, smtp_service_options: this.smtp_service_options});
      this.$el.html(template);
    }
  }
});

// Setup the generic alert link view
var AlertView = Backbone.View.extend({
  el: '.popup',
  events: {
    'click .close' : 'close'
  },
  close: function () {
    if (/\/api\/verify/i.test(window.location.pathname)) {
      window.history.back();
    }
  },
  render: function (options) {
    var template = _.template($('#alert-template').html(), {label: options.label, msg: options.msg }); 
    this.$el.html(template);
    $('#alert-modal').modal('show');
  }
});

// Create the session and views
var session           = new Session();
var signUpView        = new SignUpView();
var loginView         = new LoginView();
var alertView         = new AlertView();
var userListView      = new UserListView();
var pageListView      = new PageListView();
var viewListView      = new ViewListView();
var varListView       = new VarListView();
var userDetailView    = new UserDetailView();
var pageDetailView    = new PageDetailView();
var viewDetailView    = new ViewDetailView();
var varDetailView     = new VarDetailView();
var siteDetailView    = new SiteDetailView();

// Map an event to each route
var Router = Backbone.Router.extend({
    routes: {
      "":                          "home",
      "signup":                    "signup",
      "login":                     "login",
      "logout":                    "logout",
      "users":                     "list-users",
      "users/new":                 "edit-user",
      "users/:id":                 "edit-user",
      "verify/:token":             "verify-email",
      "pages":                     "list-pages",
      "pages/new":                 "edit-page",
      "pages/:id":                 "edit-page",
      "views":                     "list-views",
      "views/new":                 "edit-view",
      "views/:id":                 "edit-view",
      "vars":                      "list-vars",
      "vars/new":                  "edit-var",
      "vars/:id":                  "edit-var",
      "site":                      "edit-site"
    }
});

// Setup the behavior for each route event
var router = new Router;
router.on('route:home', function() {
  if (session.get('auth')) {
    navselect("pages");
    // Render pages list view
    pageListView.render();
  }
})
router.on('route:signup', function() {
  // Render signup view
  signUpView.render();
})
router.on('route:login', function() {
  // Render login view
  loginView.render();
})
router.on('route:logout', function() {
  session.logout();
})
router.on('route:list-users', function() {
  navselect("users");
  // Render user list view
  userListView.render();
})
router.on('route:edit-user', function(id) {
  navselect("users");
  // Render user detail view
  userDetailView.render({id: id});
})
router.on('route:verify-email', function(token) {
  // Verify email and show alert view
  if (token) {
    this.token = token;
    var that = this;
    $.ajax({
      type: "PUT",
      url: "/verify/" + that.token,
      data: null,
      success: function () {
        alertView.render({label:"Verified", msg: "Your email has been verified.<br/>Your account is ready to use."});
      },
      error: function () {
        alertView.render({label:"Sorry", msg: "Your verification token was missing or invalid."});
      }
    });
  }
})
router.on('route:list-pages', function() {
  navselect("pages");
  // Render page list view
  pageListView.render();
})
router.on('route:edit-page', function(id) {
  navselect("pages");
  // Render page detail view
  pageDetailView.render({id: id});
})
router.on('route:list-views', function() {
  navselect("views");
  // Render view list view
  viewListView.render();
})
router.on('route:edit-view', function(id) {
  navselect("views");
  // Render view detail view
  viewDetailView.render({id: id});
})
router.on('route:list-vars', function() {
  navselect("vars");
  // Render var list view
  varListView.render();
})
router.on('route:edit-var', function(id) {
  navselect("vars");
  // Render var detail view
  varDetailView.render({id: id});
})
router.on('route:edit-site', function() {
  navselect("site");
  // Render site detail view
  siteDetailView.render();
})

// Init
init();
