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

// prefilter for all ajax calls
$.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
  // Modify options, control originalOptions, store jqXHR, etc
  options.url = options.url + "?apikey=" + encodeURIComponent(apikey);
});

function fullscreenEditor(editor) {
  $('#editor').removeClass('span4 small-editor').addClass('fullscreen-editor');
  editor.resize();
  editor.focus();
  editor.commands.addCommand({
    name: 'exitFullscreen',
    bindKey: {win: 'Esc',  mac: 'Esc'},
    exec: function(editor) {
      $('#editor').removeClass('fullscreen-editor').addClass('span4 small-editor');
      editor.resize();
    }
  });
}

function toggleFullscreen(editor) {
  if ($('#editor').hasClass('fullscreen-editor')) {
    $('#editor').removeClass('fullscreen-editor').addClass('span4 small-editor');
  }
  else {
    $('#editor').removeClass('span4 small-editor').addClass('fullscreen-editor');
  }   
  editor.resize();
}

function renderEditor(element_id, content, cursor) {
  var editor = ace.edit(element_id);
  editor.setTheme("ace/theme/textmate");
  editor.getSession().setMode("ace/mode/html");
  editor.getSession().setTabSize(2);
  editor.getSession().setUseSoftTabs(true);
  document.getElementById(element_id).style.fontSize='14px';
  editor.getSession().setUseWrapMode(true);
  editor.setValue(content);
  editor.focus();
  editor.commands.addCommand({
    name: 'toggleFullscreen',
    bindKey: {win: 'Esc',  mac: 'Esc'},
    exec: function(editor) {
      toggleFullscreen(editor);
    }
  });
  if (cursor) editor.moveCursorTo(cursor.row, cursor.column);
  return editor;
}

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
    case /#\/pwreset/i.test(window.location.href):
      loadnavbar();
      Backbone.history.start();
      break;
    case /#\/pwchange/i.test(window.location.href):
      loadnavbar();
      Backbone.history.start();
      break;
    default:
      session.fetch({
        success: function () {
          if (!session.get('auth')) {
            loginView.render();
          }
          Backbone.history.start();
        },
        error: function () {
          loginView.render();
          Backbone.history.start();
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
  if (session.get('role') == 'Admin') {
    var template = _.template($('#authbar-template').html(), {session: session});
    $(".authbar").html(template);
    var template = _.template($('#navbar-template').html(), {auth: session.get('auth'), admin: (session.get('role') == 'Admin')}); 
    $(".navbar-inner").html(template);
    if (selection) {
      navselect(selection);
    }
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

// Setup the signup view
var SignUpView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .signup-form': 'saveUser',
    'click .close'       : 'close'
  },
  saveUser: function (ev) {
    var userDetails = getFormData(ev.currentTarget);
    var user = new User();
    user.save(userDetails, {
      success: function (user) {
        $('.modal-body').html($('.signup-step2').html());
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save User", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  close: function () {
    this.$el.html('');
    router.navigate('login');
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
    var loginDetails = getFormData(ev.currentTarget);
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
            if (session.get("role") == "Admin") {
              router.navigate('pages', {trigger:true});
              loadnavbar();
            }
            else {
              window.location.href = "/";
            }
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
    this.$el.html('');
  },
  render: function (options) {
    var template = $('#login-template').html();
    this.$el.html(template);
    $('#login-modal').modal('show');
  }
});

// Setup the password reset view
var PwresetView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .pwreset' : 'requestReset',
    'click .close'   : 'close'
  },
  requestReset: function (ev) {
    this.formData = getFormData(ev.currentTarget);
    if (this.formData.email) {
      var that = this;
      $.ajax({
        type: "PUT",
        url: apibase + "/pwreset/" + this.formData.email,
        data: null,
        success: function (data, status, xhr) {
          $('#pwreset-modal').modal('hide');
          if (data && data.email) {
            alertView.render({label:"Check your email", msg: "In a few moments you should receive an email telling you what to do next.", onclose: "home"});
          }
          else {
            alertView.render({label:"Problem", msg: "The email you entered does not match any current user.", onclose: "pwreset"});
          }
        },
        error: function (xhr) {
          $('.alert-msg').html($.parseJSON(xhr.responseText).msg);
          $('.pwreset-fail').show();
        }
      });
    }
  },
  close: function () {
    this.$el.html('');
    loginView.render();
  },
  render: function (options) {
    // if coming from the login view, then avoid double dark background
    if ($('#login-modal')) {
      console.log("hide");
      $('#login-modal').modal('hide');
    }
    var msg = "Enter the email address of the user account. We will send a password reset confirmation to that address.";
    var template = _.template($('#pwreset-template').html(), {email: (options && options.email) ? options.email : null, msg: msg}); 
    this.$el.html(template);
    $('#pwreset-modal').modal('show');
  }
});

// Setup the password change view
var PwchangeView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .pwchange' : 'changePassword',
    'click .close'    : 'close'
  },
  changePassword: function (ev) {
    this.formData = getFormData(ev.currentTarget);
    if (this.formData.token 
    && this.formData.password 
    && this.formData.confirmpassword 
    && (this.formData.password == this.formData.confirmpassword)) {
      var that = this;
      $.ajax({
        type: "PUT",
        url: apibase + "/pwchange/" + this.formData.token,
        data: {password: this.formData.password},
        success: function () {
          $('#pwchange-modal').modal('hide');
          alertView.render({label:"Success", msg: "Your password has been changed,<br/>and you are now logged in.", onclose: "home"});
        },
        error: function (data) {
          $('.alert-msg').html($.parseJSON(data.responseText).msg);
          $('.pwchange-fail').show();
        }
      });
    }
  },
  close: function () {
    this.$el.html('');
  },
  render: function (options) {
    var template = _.template($('#pwchange-template').html(), {token: (options && options.token) ? options.token : null}); 
    this.$el.html(template);
    $('#pwchange-modal').modal('show');
  }
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
    console.log("fetchingpagelist");
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
    var varDetails = getFormData($(ev.currentTarget).parents("form:first"));
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

// Setup the user detail view
var UserDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-user-form': 'saveUser',
    'click .delete-user'    : 'deleteUser',
    'click .cancel'         : 'cancel',
    'click .user-pwreset'   : 'requestReset'
  },
  saveUser: function (ev) {
    var userDetails = getFormData(ev.currentTarget);
    if (!this.user) {
      this.user = new User();
    }
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
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save User", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  deleteUser: function (ev) {
    this.user.destroy({
      success: function () {
        console.log('user destroyed');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Delete User", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  requestReset: function (ev) {
    this.email = $(ev.currentTarget).attr('data-user-email');
    if (this.email) {
      var that = this;
      $.ajax({
        type: "PUT",
        url: apibase + "/pwreset/" + this.email,
        data: null,
        success: function () {
          alertView.render({label:"Check your email", msg: "In a few moments you should receive an email telling you what to do next."});
        },
        error: function (xhr) {
          alertView.render({label:"Sorry", msg: $.parseJSON(xhr.responseText).msg});
        }
      });
    }
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
    'click  .cancel'         : 'cancel',
    'click  .fullscreen-page': 'fullscreenEditPage'
  },
  fullscreenEditPage: function (ev) {
    toggleFullscreen(this.editor);
    this.editor.focus();
  },
  savePage: function (ev) {
    var pageDetails = getFormData(ev.currentTarget);
    pageDetails.content = this.editor.getValue();
    pageDetails.cursor  = this.editor.selection.getCursor();
    if (!this.page) {
      this.page = new Page();
    }
    this.page.save(pageDetails, {
      success: function (page) {
        console.log('page saved');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Page", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  deletePage: function (ev) {
    this.page.destroy({
      success: function () {
        console.log('page destroyed');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Delete Page", msg: $.parseJSON(xhr.responseText).msg});
        }
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
              that.editor = renderEditor('editor', that.page.get('content'), that.page.get('cursor'));
            }
          });
        } else {
          that.page = null;
          var template = _.template($('#edit-page-template').html(), {page: that.page, views: that.views, access_options: that.access_options, status_options: that.status_options});
          that.$el.html(template);
          that.editor = renderEditor('editor', null, { row: 0, column: 0 });
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
    'click  .cancel'         : 'cancel',
    'click  .fullscreen-view': 'fullscreenEditView'
  },
  fullscreenEditView: function (ev) {
    toggleFullscreen(this.editor);
    this.editor.focus();
  },
  saveView: function (ev) {
    var viewDetails = getFormData(ev.currentTarget);
    viewDetails.template = this.editor.getValue();
    viewDetails.cursor   = this.editor.selection.getCursor();
    if (!this.view) {
      this.view = new View();
    }
    this.view.save(viewDetails, {
      success: function (view) {
        console.log('view saved');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save View", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  deleteView: function (ev) {
    this.view.destroy({
      success: function () {
        console.log('view destroyed');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Delete View", msg: $.parseJSON(xhr.responseText).msg});
        }
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
          that.editor = renderEditor('editor', that.view.get('template'), that.view.get('cursor'));
        }
      })
    } else {
      this.view = null;
      var template = _.template($('#edit-view-template').html(), {view: this.view});
      this.$el.html(template);
      this.editor = renderEditor('editor', null, { row: 0, column: 0 });
    }
  }
});

// Setup the var detail view
var VarDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-var-form' : 'saveVar',
    'click  .delete-var'    : 'deleteVar',
    'click  .cancel'        : 'cancel'
  },
  saveVar: function (ev) {
    var varDetails = getFormData(ev.currentTarget);
    if (!this.var) {
      this.var = new Var();
    }
    this.var.save(varDetails, {
      success: function (vari) {
        console.log('var saved');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Var", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  deleteVar: function (ev) {
    this.var.destroy({
      success: function () {
        console.log('var destroyed');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Delete Var", msg: $.parseJSON(xhr.responseText).msg});
        }
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

var addArrayOrString = function(object, name, text) {
  if (name.match(/\[\]/)) {
    name = name.replace('[]','');
    object[name] = text.replace(' ','').split(',');
    return object;
  }
  else {
    object[name] = text;
    return object;
  }
}

// grabs all form data, puts into an object
// form elements with a name like 'item.subitem' will be put into an 'item' subobject
// form elements with a name like 'items[]' will be parsed into an 'items' array of text
var getFormData = function(form) {
  if (form) {
    var formObject = {};
    var formData = $(form).serializeObject();
    for (item in formData) {
      if (item.split('.').length>1) {
        var item_name    = item.split('.')[0];
        var subitem_name = item.split('.')[1];
        // make sure the formObject has the subobject
        if (!formObject.hasOwnProperty(item_name)) {
          formObject[item_name] = {};
        }
        formObject[item_name] = addArrayOrString(formObject[item_name], subitem_name, formData[item]);
      }
      else {
        formObject = addArrayOrString(formObject, item, formData[item]);
      }
    }
    return formObject;
  }
  else {
    return null;
  }
}

// Setup the site detail view
var SiteDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-site-form' : 'saveSite',
    'click .cancel'         : 'cancel'
  },
  saveSite: function (ev) {
    var siteDetails = getFormData(ev.currentTarget);
    if (!this.site) {
      this.site = new Site();
    }
    if (siteDetails) {
      this.site.save(siteDetails, {
        success: function (site) {
          console.log('site saved');
          alertView.render({label:"Config changed", msg: "Changes are effective immediately.", onclose: "site"});
        },
        error: function (model, xhr) {
          console.log(xhr);
          if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
            alertView.render({label:"Update Site", msg: $.parseJSON(xhr.responseText).msg});
          }
        }
      });
    }
    else {
      alertView.render({label:"Update Site", msg: "Nothing to update."});
    }
    return false;
  },
  cancel: function() {
    window.history.back();
  },
  render: function () {
    // build the list of cors mode options
    this.cors_mode_options = ['Allow All', 'White List'];
    // build the list of smtp service options
    this.smtp_service_options = ['Gmail', 'Other SMTP'];
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
    $('.modal-backdrop').remove();
    this.$el.html('');
    // accepts the name of a route to go to after close
    if (this.onclose) {
      router.navigate(this.onclose);
    }
    if (/\/api\/verify/i.test(window.location.pathname)) {
      //loginView.render();
    }
  },
  render: function (options) {
    $('.modal-backdrop').remove();
    var template = _.template($('#alert-template').html(), {label: options.label, msg: options.msg }); 
    this.$el.html(template);
    $('#alert-modal').modal('show');
    if (options && options.onclose) {
      this.onclose = options.onclose;
    }
  }
});

// Create the session and views
var session           = new Session();
var signUpView        = new SignUpView();
var loginView         = new LoginView();
var pwresetView       = new PwresetView();
var pwchangeView      = new PwchangeView();
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
      "pwreset":                   "pw-reset",
      "pwreset/:email":            "pw-reset",
      "pwchange":                  "pw-change",
      "pwchange/:token":           "pw-change",
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
router.on('route:pw-reset', function(email) {
  // Render pwreset view
  pwresetView.render({email: email});
})
router.on('route:pw-change', function(token) {
  // Render pwchange view
  pwchangeView.render({token: token});
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
      url: apibase + "/verify/" + that.token,
      data: null,
      success: function () {
        alertView.render({label:"Verified", msg: "Your email has been verified.<br/>Your account is ready to use.", onclose: "home"});
      },
      error: function () {
        alertView.render({label:"Sorry", msg: "Your verification token was missing or invalid.", onclose: "home"});
      }
    });
  }
})
router.on('route:list-pages', function() {
  console.log("listpages");
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
