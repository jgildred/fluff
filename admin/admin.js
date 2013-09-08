
// automatically run upon loading this js file
function init () {

  // make sure the api key is correct if required
  var version = '0.8';
  var apikey  = '1234567890';
  
  // display the version at the footer
  $(".attribution").html($(".attribution").html() + " " + version);

  // prefilter for all ajax calls
  if (apikey && (apikey != '')) {
    $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
      // Modify options, control originalOptions, store jqXHR, etc
      options.headers = options.headers ? options.headers : {};
      options.headers['X-API-Key'] = encodeURIComponent(apikey);
    });
  }

  // handle the various url cases where login is not forced
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
            loginView.render(window.location.pathname);
          }
          else {
            if (session.get('user') && (session.get('user').role != "Admin")) {
              alertView.render({label:"Restricted", msg: "Sorry, you need to be an admin to access this.", cantclose: true});
            }
            else {
              $('title').html((session.get('site').name ? session.get('site').name : 'Site') + ' Admin');
            }
          }
          Backbone.history.start();
        },
        error: function () {
          loginView.render();
          Backbone.history.start();
        }
      });
  }
}

// Helper functions
function objectType(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}
function htmlEncode(value) {
  return $('<div/>').text(value).html();
}
function flattenArray(objectArray, key) {
  var array = [];
  objectArray.forEach(function (object) {
    array.push(object[key]);
  });
  return array;
}
// Useful when comparing schema attributes
var lowerCaseObject = function (obj) {
  var key,
      keys = Object.keys(obj);
  var n = keys.length;
  var newobj={};
  while (n--) {
    key = keys[n];
    newobj[key.toLowerCase()] = obj[key];
  }
  return newobj;
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
// use the "good" Collection methods to emulate Array.splice
function hacked_splice(index, howMany /* model1, ... modelN */) {
  var args  = _.toArray(arguments).slice(2).concat({at: index}),
    removed = this.models.slice(index, index + howMany);
  this.remove(removed).add.apply(this, args);
  return removed;
}
// show a log of events getting fired
function log_events(event, model) {
  var now = new Date();
  $("#example1_events").prepend(
      $("<option/>").text([
        ":", now.getSeconds(), ":", now.getMilliseconds(),
        "[" + event + "]",
        JSON.stringify(model)
      ].join(" "))
    )
    .scrollTop(0);
}

var metaSave = function(on, callback) {
  if (on && callback) {
    $(window).bind('keydown',function(e){
      if (!( String.fromCharCode(e.which).toLowerCase() == 's' && e.metaKey)) return true;
      e.preventDefault();
      callback();
      return false;
    });
  }
  else {
    $(window).unbind('keydown');
  }
}

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

// Grabs all form data and puts it into an object.
// Form elements with a name like 'item.subitem' will be put into an 'item' subobject.
// Form elements with a name like 'items[]' will be parsed into an 'items' array of text.
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

function toggleFullscreen(editor) {
  var e   = $('#editor');
  var fse = $('#fullscreen-editor-container');
  if (fse.hasClass('hidden')) {
    var element_id = 'fullscreen-editor';
    var content    = editor.getValue();
    var cursor     = editor.selection.getCursor();
    var mode       = editor.getSession().getMode();
    var view       = editor.targetView;
    editor.targetView.editor = renderEditor(element_id, content, cursor, mode, view, true);
    fse.removeClass('hidden');
    e.addClass('hidden');
  }
  else {
    var element_id = 'editor';
    var content    = editor.getValue();
    var cursor     = editor.selection.getCursor();
    var mode       = editor.getSession().getMode();
    var view       = editor.targetView;
    editor.targetView.editor = renderEditor(element_id, content, cursor, mode, view);
    e.removeClass('hidden');
    fse.addClass('hidden');
  }
  editor.targetView.editor.resize();
}

function renderEditor(element_id, content, cursor, mode, view, fullscreen) {
  var editor = ace.edit(element_id);
  editor.setTheme("ace/theme/textmate");
  if (mode) {
    editor.getSession().setMode(mode);
  } else {
    editor.getSession().setMode("ace/mode/html");
  }
  editor.getSession().setTabSize(2);
  editor.getSession().setUseSoftTabs(true);
  document.getElementById(element_id).style.fontSize='14px';
  editor.getSession().setUseWrapMode(true);
  editor.setValue(content);
  editor.commands.addCommand({
    name: 'toggleFullscreen',
    bindKey: {win: 'Esc',  mac: 'Esc'},
    exec: function(editor) {
      toggleFullscreen(editor);
    }
  });
  if (view) {
    editor.targetView = view;
    if (fullscreen) {
      metaSave(true, view.submitForm);
    }
    else {
      metaSave(false);
    }
  }
  else {
    metaSave(false);
  }
  editor.focus();
  if (cursor) editor.moveCursorTo(cursor.row, cursor.column);
  editor.clearSelection();
  return editor;
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
  $('header').removeClass('hidden');
  $('footer').removeClass('hidden');
  if (session.get('user') && (session.get('user').role == 'Admin')) {
    var template = _.template($('#authbar-template').html(), {session: session});
    $(".authbar").html(template);
    var template = _.template($('#navbar-template').html(), {auth: session.get('auth'), admin: (session.get('user').role == 'Admin')}); 
    $(".navbar-inner").html(template);
    if (selection) {
      navselect(selection);
    }
  }
}

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

// Setup the models
var User    = Backbone.Model.extend({
  urlRoot: apibase + '/users'
});
var Page    = Backbone.Model.extend({
  urlRoot: apibase + '/pages'
});
var View    = Backbone.Model.extend({
  urlRoot: apibase + '/views'
});
var Var     = Backbone.Model.extend({
  urlRoot: apibase + '/vars'
});
var Model   = Backbone.Model.extend({
  urlRoot: apibase + '/models'
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
        window.location.href = adminbase;
      }
    });
  },
  getAuth: function(callback) {
    this.fetch();
  }
});

// Setup the collections
var Users  = Backbone.Collection.extend({
  url: apibase + '/users'
});
var Pages  = Backbone.Collection.extend({
  url: apibase + '/pages'
});
var Views  = Backbone.Collection.extend({
  url: apibase + '/views'
});
var Vars   = Backbone.Collection.extend({
  url: apibase + '/vars'
});
var Models = Backbone.Collection.extend({
  url: apibase + '/models'
});
var Sites  = Backbone.Collection.extend({
  url: apibase + '/sites'
});

// Setup the signup view
var SignUpView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .signup-form' : 'saveUser',
    'click  .close'       : 'close'
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
    'submit .login-form' : 'login',
    'click  .close'      : 'close'
  },
  login: function (ev) {
    var loginDetails = getFormData(ev.currentTarget);
    session.login(loginDetails, function () {
      if (session.get("auth") && session.get("user")) {
        switch (session.get("user").status) {
          case 'Inactive':
            $('.alert-msg').html('This account has been deactivated.');
            $('.login-fail').show();
            break;
          case 'Unverified':
            $('.alert-msg').html('Please check your email to verify.');
            $('.login-fail').show();
            break;
          default:
            $('#login-modal').modal('hide');
            if (session.get("user").role == "Admin") {
              if (/#\/login/i.test(window.location.href)) {
                loadnavbar();
                router.navigate('pages', {trigger: true});
              }
              else {
                document.location.reload();
              }
            }
            else {
              document.location.href = "/";
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
  render: function () {
    // make sure not to have a double backdrop
    $(".modal-backdrop").remove();
    var template = $('#login-template').html();
    this.$el.html(template);
    $('#login-modal').modal('show');
    $('.login-form input')[0].focus();
  }
});

// Setup the password reset view
var PwresetView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .pwreset-form' : 'requestReset',
    'click  .cancel'       : 'cancel'
  },
  requestReset: function (ev) {
    this.formData = getFormData(ev.currentTarget);
    if (this.formData.email) {
      $.ajax({
        type: "PUT",
        url: apibase + "/pwreset/" + this.formData.email,
        data: null,
        success: function (data, status, xhr) {
          if (data) {
            $('#pwreset-modal').modal('hide');
            alertView.render({
              label:   "Check your email", 
              msg:     "In a few moments you should receive<br/>an email telling you what to do next.", 
              cantclose: true});
          }
          else {
            $('.alert-msg').html('The email you entered does not match any current user');
            $('.pwreset-fail').show();
          }
        },
        error: function (xhr) {
          $('.alert-msg').html($.parseJSON(xhr.responseText).msg);
          $('.pwreset-fail').show();
        }
      });
    }
    else {
      $('.alert-msg').html("Where's the email?");
      $('.pwreset-fail').show();
    }
    return false;
  },
  cancel: function () {
    $('#pwreset-modal').modal('hide');
    window.history.back();
  },
  render: function (options) {
    // make sure not to have a double backdrop
    $(".modal-backdrop").remove();
    var msg = "Enter the email address of the user account. We will send a password reset confirmation to that address.";
    var template = _.template($('#pwreset-template').html(), {email: (options && options.email) ? options.email : null, msg: msg}); 
    this.$el.html(template);
    $('#pwreset-modal').modal('show');
    $('.pwreset-form input')[0].focus();
  }
});

// Setup the password change view
var PwchangeView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .pwchange-form' : 'changePassword',
    'click  .close'         : 'close'
  },
  changePassword: function (ev) {
    this.formData = getFormData(ev.currentTarget);
    if (this.formData.token 
    && this.formData.password 
    && this.formData.confirmpassword 
    && (this.formData.password == this.formData.confirmpassword)) {
      $.ajax({
        type: "PUT",
        url: apibase + "/pwchange/" + this.formData.token,
        data: {password: this.formData.password},
        success: function () {
          $('#pwchange-modal').modal('hide');
          alertView.render({
            label:   "Success", 
            msg:     "Your password has been changed,<br/>and you can login with the new password.", 
            cantclose: true});
        },
        error: function (xhr) {
          $('.alert-msg').html($.parseJSON(xhr.responseText).msg);
          $('.pwchange-fail').show();
        }
      });
    }
    else {
      $('.alert-msg').html("Something is missing or passwords don't match.");
      $('.pwchange-fail').show();
    }
    return false;
  },
  close: function () {
    this.$el.html('');
  },
  render: function (options) {
    var template = _.template($('#pwchange-template').html(), {token: (options && options.token) ? options.token : null}); 
    this.$el.html(template);
    $('#pwchange-modal').modal('show');
    $('.pwchange-form input')[0].focus();
  }
});

// Setup the user list view
var UserListView = Backbone.View.extend({
  el: '.page',
  render: function (keyword) {
    this.users = new Users();
    var that = this;
    this.users.fetch({
      success: function (users) {
        var template = _.template($('#user-list-template').html(), {users: that.users.models});
        that.$el.html(template);
      }
    })
  }
});

// Setup the page list view
var PageListView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .search-pages-form' : 'searchPages'
  },
  searchPages: function (ev) {
    var keyword = getFormData(ev.currentTarget).keyword;
    this.render(keyword);
    return false;
  },
  render: function (keyword) {
    // first get the list of views for the page list view
    this.views = new Views();
    var that = this;
    this.views.fetch({
      data: $.param({ fields: 'name'}),
      success: function (views) {
        that.views = views ? views : [];
        // then get the list of pages
        that.pages = new Pages();
        that.params = {fields: 'name,path,view_id,access,status,lastupdate'};
        if (keyword) {
          that.params.content = keyword;
        }
        that.pages.fetch({
          data: $.param(that.params),
          success: function (pages) {
            var template = _.template($('#page-list-template').html(), {pages: pages.models, views: that.views});
            that.$el.html(template);
            if (keyword) {
              $('.search-pages-keyword').val(keyword);
            }
            $('.search-pages-keyword').focus();
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
    this.views = new Views();
    this.views.fetch({
      data: $.param({ fields: 'name,content_type,lastupdate'}),
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
        $('.edit-var-quickform .edit-var-value')[0].focus();
      }
    })
  }
});

// Setup the var add view
var VarAddView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .add-var-form' : 'saveVar',
    'click  .cancel'       : 'cancel'
  },
  saveVar: function (ev) {
    var varDetails = getFormData(ev.currentTarget);
    var vari = new Var();
    vari.save(varDetails, {
      success: function (vari) {
        console.log('var saved');
        $('#add-var-modal').modal('hide');
        router.navigate('list-vars');
        varListView.render();
      },
      error: function (model, xhr) {
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Var", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  cancel: function() {
    $('#add-var-modal').modal('hide');
    window.history.back();
  },
  render: function () {
    var template = _.template($('#add-var-template').html(), {vari: null});
    this.$el.html(template);
    $('#add-var-modal').modal('show');
    $('.add-var-form .add-var-name')[0].focus();
  }
});

// Setup the model list view
var ModelListView = Backbone.View.extend({
  el: '.page',
  render: function (keyword) {
    this.models = new Models();
    var that = this;
    this.models.fetch({
      success: function (models) {
        if (models.length > 0) {
          _.each(that.models.models, function (model) { 
            model.set({count: '?'});
            $.ajax({
              type: "GET",
              dataType: "json",
              url: adminbase.slice(0,adminbase.indexOf('admin')-1) + '/api/' + model.get('name').toLowerCase() + '/count',
              data: null,
              success: function (data) {
                if (data) {
                  model.set({count: data.count});
                }
                var template = _.template($('#model-list-template').html(), {models: that.models.models});
                that.$el.html(template);
              },
              // Show the table even if the counts are missing
              error: function () {
                var template = _.template($('#model-list-template').html(), {models: that.models.models});
                that.$el.html(template);
              }
            });
          });
        }
        else {
          var template = _.template($('#model-list-template').html(), {models: null});
          that.$el.html(template);
        }
      },
      error: function (data, xhr) {
        alertView.render({label:"Sorry", msg: $.parseJSON(xhr.responseText).msg});
      }
    })
  }
});

// Setup the user detail view
var UserDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-user-form' : 'saveUser',
    'click  .delete-user'    : 'deleteUser',
    'click  .cancel'         : 'cancel',
    'click  .user-pwreset'   : 'requestReset'
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
          alertView.render({label:"Email sent", msg: "In a few moments the user should receive<br/>an email with password reset instructions."});
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
    'submit .edit-page-form'  : 'savePage',
    'click  .delete-page'     : 'deletePage',
    'click  .cancel'          : 'cancel',
    'click  .fullscreen-page' : 'fullscreen'
  },
  fullscreen: function (ev) {
    toggleFullscreen(this.editor);
  },
  submitForm: function () {
    $('.edit-page-form').submit();
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
        if ($('#fullscreen-editor-container').hasClass('hidden')) {
          window.history.back();
        }
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
              that.editor = renderEditor('editor', that.page.get('content'), that.page.get('cursor'), null, that);
              $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
              $('.save-fullscreen-editor').click(that.submitForm);
              $('.close-fullscreen-editor').click(function() {
                toggleFullscreen(that.editor);
              });
            }
          });
        } else {
          that.page = null;
          var template = _.template($('#edit-page-template').html(), {page: that.page, views: that.views, access_options: that.access_options, status_options: that.status_options});
          that.$el.html(template);
          that.editor = renderEditor('editor', null, { row: 0, column: 0 }, null, that);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.save-fullscreen-editor').click(that.submitForm);
          $('.close-fullscreen-editor').click(function() {
            toggleFullscreen(that.editor);
          });
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
  },
  submitForm: function () {
    $('.edit-view-form').submit();
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
        if ($('#fullscreen-editor-container').hasClass('hidden')) {
          window.history.back();
        }
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
    this.content_types = [ "text/html", "text/css", "text/plain", "application/javascript", "application/json", "application/xml" ];
    if(options.id) {
      this.view = new View({_id: options.id});
      this.view.fetch({
        success: function (view) {
          var template = _.template($('#edit-view-template').html(), {view: view, content_types: that.content_types}); 
          that.$el.html(template);
          that.editor = renderEditor('editor', that.view.get('template'), that.view.get('cursor'), null, that);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.save-fullscreen-editor').click(that.submitForm);
          $('.close-fullscreen-editor').click(function() {
            toggleFullscreen(that.editor);
          });
        }
      })
    } else {
      this.view = null;
      var template = _.template($('#edit-view-template').html(), {view: this.view, content_types: this.content_types});
      this.$el.html(template);
      this.editor = renderEditor('editor', null, { row: 0, column: 0 }, null, that);
      $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
      $('.save-fullscreen-editor').click(that.submitForm);
      $('.close-fullscreen-editor').click(function() {
        toggleFullscreen(that.editor);
      });
    }
  }
});

// Setup the model detail view
var ModelDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .edit-model-form'   : 'saveModel',
    'click  .delete-model'      : 'deleteModel',
    'click  .cancel'            : 'cancel',
    'click  .fullscreen-schema' : 'fullscreenEditSchema'
  },
  fullscreenEditSchema: function (ev) {
    toggleFullscreen(this.editor);
  },
  submitForm: function () {
    $('.edit-model-form').submit();
  },
  saveModel: function (ev) {
    var modelDetails = getFormData(ev.currentTarget);
    modelDetails.schema_data = this.editor.getValue();
    modelDetails.cursor      = this.editor.selection.getCursor();
    // Remove the model_id as you can't change it
    delete modelDetails.model_id;
    if (!this.model) {
      this.model = new Model();
    }
    this.model.save(modelDetails, {
      patch: true,
      success: function (model) {
        console.log('model saved');
        if ($('#fullscreen-editor-container').hasClass('hidden')) {
          window.history.back();
        }
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  deleteModel: function (ev) {
    this.model.destroy({
      success: function () {
        console.log('model destroyed');
        window.history.back();
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Delete Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    })
  },
  cancel: function() {
    window.history.back();
  },
  render: function (options) {
    // build the list of access options
    this.access_options = ['Public', 'Users', 'Admins'];
    var that = this;
    if (options.id) {
      // then get the model details
      that.model = new Model({_id: options.id});
      that.model.fetch({
        success: function (model) {
          var template = _.template($('#edit-model-template').html(), {model: model, access_options: that.access_options});
          that.$el.html(template);
          that.editor = renderEditor('editor', that.model.get('schema_data'), that.model.get('cursor'), 'ace/mode/javascript', that);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.save-fullscreen-editor').click(that.submitForm);
          $('.close-fullscreen-editor').click(function() {
            toggleFullscreen(that.editor);
          });
        }
      });
    } else {
      that.model = null;
      var template = _.template($('#edit-model-template').html(), {model: that.model, access_options: that.access_options});
      that.$el.html(template);
      that.editor = renderEditor('editor', null, { row: 0, column: 0 }, 'ace/mode/javascript', that);
      $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
      $('.save-fullscreen-editor').click(that.submitForm);
      $('.close-fullscreen-editor').click(function() {
        toggleFullscreen(that.editor);
      });
    }
  }
});

// Setup the model browse view
var ModelBrowseView = Backbone.View.extend({
  el: '.page',
  events: {
    'click  .add-modelitem'     : 'addItem',
    'click  .delete-modelitems' : 'deleteItems',
    'click  .arrange-columns'   : 'arrangeColumns',
    'click  .import'            : 'import'
  },
  addItem: function () {
    this.modelItem = new this.ModelItem();
    var that = this;
    this.modelItem.save(null, {
      success: function () {
        that.modelItems.add(that.modelItem);
        that.render({id: that.model.id});
      },
      error: function () {
        console.log("Could not save the new model.");
      }
    });
  },
  deleteItems: function () {
    var selections = [];
    var ht         = this.$container.handsontable('getInstance');
    var selection  = ht.getSelected();
    console.log(selection);
    var lowSelection  = (selection[0] <= selection[2]) ? selection[0] : selection[2];
    var highSelection = (selection[0] <= selection[2]) ? selection[2] : selection[0];
    var models = [];
    for (var r = lowSelection; r <= highSelection; r++) {
      var dataRow = ht.getCellMeta(r,0).row;
      models.push(ht.getData().models[dataRow]);
    }
    var that = this;
    models.forEach( function (model, index) {
      model.destroy({
        success: function () {
          if (index == models.length - 1) {
            that.render({id: that.model.id});
          }
        },
        error: function (model) {
          console.log("Could not destroy model " + model.id);
        }
      });
    });
  },
  arrangeColumns: function () {
    var availableColumns = [];
    for (attribute in this.schema) {
      availableColumns.push({
        name  : attribute,
        title : attribute.humanize(),
        size  : 100
      });
    }
    this.displayColumns.forEach(function (column, index) {
      var matchIndex = flattenArray(availableColumns, 'name').indexOf(column.name);
      if (matchIndex != -1) {
        availableColumns.splice(matchIndex, 1);
      }
    });
    availableColumns = this.displayColumns.concat(availableColumns);
    arrangeColumnsView.render(availableColumns, flattenArray(this.displayColumns, 'name'));
  },
  import: function () {
    importView.render();
  },
  render: function (options) {
    // build the list of access options
    this.access_options = ['Public', 'Users', 'Admins'];
    var that = this;
    if (options.id) {
      // then get the model details
      this.model = new Model({_id: options.id});
      this.model.fetch({
        success: function (model) {
          that.ModelItem = Backbone.Model.extend({
            urlRoot: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + model.get('name').toLowerCase(),
            initialize: function () {
              this.on("change", function (model, options) {
                if (options && options.save === false) return;
                if (model.hasChanged("name")) {
                  model.save();
                }
              });
            }
          });
          that.ModelItems = Backbone.Collection.extend({
            url: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + model.get('name').toLowerCase(),
            model: that.ModelItem,
            // Backbone.Collection doesn't support splice yet.
            splice: hacked_splice
          });
          var noUpdateFields = [
            '_id',
            'creator_id',
            'lastupdater_id',
            'lastupdate',
            'creation'
          ];
          // Get the schema
          var ObjectId = String,
              Buffer   = String,
              Mixed    = String;
          eval("var schema = " + model.get('schema_data'));
          schema = lowerCaseObject(schema);
          schema._id            = String;
          schema.creator_id     = String;
          schema.lastupdater_id = String;
          schema.creation       = Date;
          schema.lastupdate     = Date;
          that.schema     = schema;
          that.modelItem  = new that.ModelItem();
          that.modelItems = new that.ModelItems();
          that.modelItems.fetch({
            reset:   true,
            success: function (modelItems) {
              var template = _.template($('#browse-model-template').html(), {model: that.model});
              that.$el.html(template);
              var attr = function (attr) {
                // this lets us remember 'attr' for when when it is get/set
                return {
                  data: function (modelItem, value) {
                    if (_.isUndefined(value)) {
                      return modelItem.get(attr);
                    }
                    else {
                      modelItem.set(attr, value);
                      modelItem.save();
                    }
                  },
                  readOnly: (noUpdateFields.indexOf(attr) == -1) ? false : true
                };
              };
              var columns    = [];
              var colHeaders = [];
              var colWidths  = [];
              // If no display_columns in model, then display ID column only
              that.displayColumns = (that.model.get('display_columns') && that.model.get('display_columns').length > 0) ? that.model.get('display_columns') : [{name:'_id', title:'ID', size:100}];
              // If no sort_column in model, then sort by first display column 
              that.sortColumn = that.model.get('sort_column') ? that.model.get('sort_column') : {name: that.displayColumns[0].name, order: true};
              that.displayColumns.forEach(function (displayColumn, index) {
                if (Object.prototype.hasOwnProperty.call(that.schema, displayColumn.name)) {
                  columns.push(attr(displayColumn.name));
                  colHeaders.push(displayColumn.title ? displayColumn.title : displayColumn.name);
                  colWidths.push(displayColumn.size ? displayColumn.size : $("#model-data-grid").width()/Object.keys(that.schema).length);
                }
              });
              that.$container = $("#model-data-grid");
              that.$container.handsontable({
                data:               that.modelItems,
                dataSchema:         that.modelItem,
                manualColumnMove:   true,
                manualColumnResize: true,
                contextMenu:        false,
                columnSorting:      true,
                columns:            columns,
                colHeaders:         colHeaders,
                colWidths:          colWidths,
                outsideClickDeselects: false,
                afterColumnMove:    function (oldIndex, newIndex) {
                  that.updateColumnOrder(oldIndex, newIndex);
                },
                afterColumnResize:  function (index, size) {
                  that.updateColumnSizes(index, size);
                }
              });
              var ht = that.$container.handsontable('getInstance');
              // Add event listener to show delete button
              ht.addHook('afterSelection', function () {
                $('.delete-modelitems').show();
              });
              // Add event listener to hide delete button
              ht.addHook('afterDeselect', function () {
                ('.delete-modelitems').hide();
              });
              // Add event listener for afterColumnSort
              ht.addHook('afterColumnSort', function (index, order) {
                that.updateSortColumn(index, order);
              });
              // Apply sort
              that.displayColumns.forEach(function (displayColumn, index) {
                if (displayColumn.name == that.sortColumn.name) {
                  ht.sort(index, that.sortColumn.order);
                }
              });
            }
          });
        }
      });
    }
  },
  updateColumnOrder: function (oldIndex, newIndex) {
    var displayColumns = this.model.get('display_columns');
    var movedColumn    = this.model.get('display_columns')[oldIndex];
    if (oldIndex > newIndex) {
      displayColumns.splice(oldIndex, 1);
      displayColumns.splice(newIndex, 0, movedColumn);
    }
    else {
      displayColumns.splice(newIndex, 0, movedColumn);
      displayColumns.splice(oldIndex, 1);
    }  
    this.model.save({display_columns: displayColumns}, {
      patch: true,
      success: function (model) {
        console.log('column order saved');
      },
      error: function (model, xhr) {
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
  },
  updateColumnSizes: function (index, size) {
    this.displayColumns[index].size = size;
    this.model.save({display_columns: this.displayColumns}, {
      patch: true,
      success: function (model) {
        console.log('column size saved');
      },
      error: function (model, xhr) {
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
  },
  updateSortColumn: function (index, order) {
    this.sortColumn = {name: this.displayColumns[index].name, order: order};
    this.model.save({sort_column: this.sortColumn}, {
      patch: true,
      success: function (model) {
        console.log('column sort saved');
      },
      error: function (model, xhr) {
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
  }
});

// Setup the arrange columns view
var ArrangeColumnsView = Backbone.View.extend({
  el: '.popup',
  events: {
    'submit .arrange-columns-form' : 'applyColumns',
    'click  .cancel-arrange'       : 'cancel'
  },
  applyColumns: function (ev) {
    var newColumnNames = getFormData(ev.currentTarget).display_columns;
    var oldColumnNames = flattenArray(modelBrowseView.displayColumns, 'name');
    // Build the new display columns
    var displayColumns = [];
    newColumnNames.forEach(function (columnName) {
      var matchIndex = oldColumnNames.indexOf(columnName);
      if (matchIndex != -1) {
        displayColumns.push(modelBrowseView.displayColumns[matchIndex]);
      }
      else {
        displayColumns.push({
          name  : columnName,
          title : columnName.humanize(),
          size  : 100
        });
      }
    });
    modelBrowseView.displayColumns = displayColumns;
    modelBrowseView.model.save({display_columns: modelBrowseView.displayColumns}, {
      patch: true,
      success: function (model) {
        console.log('display columns saved');
        modelBrowseView.render({id: model.id});
        $('#arrange-columns-modal').modal('hide');
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  cancel: function () {
    $('#arrange-columns-modal').modal('hide');
  },
  render: function (availableColumns, displayColumns) {
    var template = _.template($('#arrange-columns-template').html(), {available_columns: availableColumns, display_columns: displayColumns});
    $('.popup').html(template);
    $('#arrange-columns-modal').modal('show');
  }
});

// Setup the import view
var ImportView = Backbone.View.extend({
  el: '.popup',
  events: {
    'click  .btn-import'    : 'import',
    'click  .cancel-import' : 'cancel'
  },
  import: function (ev) {
    var data, formData = getFormData($(ev.currentTarget).parents("form:first"));
    var contentType = 'application/json';
    var process  = false;
    var file     = $('input[name=file]').toArray()[0].files[0];
    if (file && (file.size > 0)) {
      data = new FormData();
      if (formData) {
        for (item in formData) {
          data.append(item, formData[item]);
        }
      }
      data.append('file', file);
      contentType = false;
    }
    else {
      data = JSON.stringify(formData);
    }
    $.ajax({
      data: data,
      cache: false,
      contentType: contentType,
      processData: process,
      type: "POST",
      url: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + modelBrowseView.model.get('name').toLowerCase() + "/import",
      success: function () {
        modelBrowseView.modelItems.reset();
        modelBrowseView.render({id: modelBrowseView.model.id});
        $('#import-modal').modal('hide');
        alertView.render({label:"Import complete", msg: "Import was successful.", onclose: "models"});
      },
      error: function (data, xhr) {
        $('#import-modal').modal('hide');
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Import problem", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  cancel: function () {
    $('#import-modal').modal('hide');
  },
  render: function () {
    var template = _.template($('#import-template').html());
    $('.popup').html(template);
    $('#import-modal').modal('show');
  }
});

// Setup the site detail view
var SiteDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'change .smtp-service-select' : 'toggleSmtpOptions',
    'submit .edit-site-form'      : 'saveSite',
    'click  .cancel'              : 'cancel'
  },
  toggleSmtpOptions: function () {
    if ($('.smtp-service-select').val() != 'SMTP') {
      $('#inputSmtpHost').attr('disabled', '');
    }
    else {
      $('#inputSmtpHost').removeAttr('disabled');
    }
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
          session.fetch({
            success: function (session) {
              $('title').html((session.get('site') ? session.get('site') : 'Site') + ' Admin');
              alertView.render({label:"Configuration changed.", msg: "Changes take effect immediately, unless you changed<br/>the port number which may take a few minutes.", onclose: "site"});
            },
            error: function (model, xhr) {
              alertView.render({label:"Configuration changed.", msg: "After the configuration changed, you can no longer login.<br/>Please check your port number or CORS settings in the DB.", onclose: "site"});
            }
          });
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
    this.smtp_service_options = [ "SMTP", "Gmail", "DynectEmail", "hot.ee", "Hotmail", "iCloud", "mail.ee", "Mail.Ru", "Mailgun", "Mailjet", "Mandrill", "Postmark", "QQ", "SendGrid", "SES", "Yahoo", "yandex", "Zoho" ];
    var that = this;
    if (!this.site) {
      var sites = new Sites();
      sites.fetch({
        success: function (sites) {
          that.site = sites.models[0];
          var template = _.template($('#edit-site-template').html(), {site: that.site, cors_mode_options: that.cors_mode_options, smtp_service_options: that.smtp_service_options});
          that.$el.html(template);
          that.toggleSmtpOptions();
          $('.edit-site-form input')[0].focus();
        }
      })
    } else {
      var template = _.template($('#edit-site-template').html(), {site: this.site, cors_mode_options: this.cors_mode_options, smtp_service_options: this.smtp_service_options});
      this.$el.html(template);
      $('.edit-site-form input')[0].focus();
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
      if (options && options.callbacck) {
        callback();
      }
    }
    if (options && options.cantclose) {
      $('#alert-modal .close').addClass('hidden');
    }
  }
});

// Create the session and views
var session              = new Session();
var signUpView           = new SignUpView();
var loginView            = new LoginView();
var pwresetView          = new PwresetView();
var pwchangeView         = new PwchangeView();
var alertView            = new AlertView();
var userListView         = new UserListView();
var userDetailView       = new UserDetailView();
var pageListView         = new PageListView();
var pageDetailView       = new PageDetailView();
var viewListView         = new ViewListView();
var viewDetailView       = new ViewDetailView();
var varListView          = new VarListView();
var varAddView           = new VarAddView();
var modelListView        = new ModelListView();
var modelDetailView      = new ModelDetailView();
var modelBrowseView      = new ModelBrowseView();
var arrangeColumnsView   = new ArrangeColumnsView();
var importView           = new ImportView();
var siteDetailView       = new SiteDetailView();

// Map an event to each route
var Router = Backbone.Router.extend({
    routes: {
      ""                  : "home",
      "signup"            : "signup",
      "login"             : "login",
      "logout"            : "logout",
      "pwreset"           : "pw-reset",
      "pwreset/:email"    : "pw-reset",
      "pwchange"          : "pw-change",
      "pwchange/:token"   : "pw-change",
      "users"             : "list-users",
      "users/new"         : "edit-user",
      "users/:id"         : "edit-user",
      "verify/:token"     : "verify-email",
      "pages"             : "list-pages",
      "pages/new"         : "edit-page",
      "pages/:id"         : "edit-page",
      "views"             : "list-views",
      "views/new"         : "edit-view",
      "views/:id"         : "edit-view",
      "vars"              : "list-vars",
      "vars/new"          : "add-var",
      "models"            : "list-models",
      "models/new"        : "edit-model",
      "models/:id"        : "edit-model",
      "models/:id/browse" : "browse-model",
      "site"              : "edit-site"
    }
});

// Setup the behavior for each route event
var router = new Router;
router.on('route:home', function() {
  if (session.get('auth')) {
    if (session.get('user') && (session.get('user').role == 'Admin')) {
      navselect("pages");
      // Render pages list view
      pageListView.render();
    }
    else {
      alertView.render({label:"Restricted", msg: "Sorry, you need to be an admin to access this.", cantclose: true});
    }
  }
  else {
    loginView.render();
  }
});
router.on('route:signup', function() {
  // Render signup view
  signUpView.render();
});
router.on('route:login', function() {
  // Render login view
  loginView.render();
});
router.on('route:logout', function() {
  session.logout();
});
router.on('route:pw-reset', function(email) {
  // Render pwreset view
  pwresetView.render({email: email});
});
router.on('route:pw-change', function(token) {
  // Render pwchange view
  pwchangeView.render({token: token});
});
router.on('route:list-users', function() {
  navselect("users");
  // Render user list view
  userListView.render();
});
router.on('route:edit-user', function(id) {
  navselect("users");
  // Render user detail view
  userDetailView.render({id: id});
});
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
});
router.on('route:list-pages', function() {
  navselect("pages");
  // Render page list view
  pageListView.render();
});
router.on('route:edit-page', function(id) {
  navselect("pages");
  // Render page detail view
  pageDetailView.render({id: id});
});
router.on('route:list-views', function() {
  navselect("views");
  // Render view list view
  viewListView.render();
});
router.on('route:edit-view', function(id) {
  navselect("views");
  // Render view detail view
  viewDetailView.render({id: id});
});
router.on('route:list-vars', function() {
  navselect("vars");
  // Render var list view
  varListView.render();
});
router.on('route:add-var', function() {
  navselect("vars");
  // Render var add view
  varAddView.render();
});
router.on('route:list-models', function() {
  navselect("models");
  // Render model list view
  modelListView.render();
});
router.on('route:edit-model', function(id) {
  navselect("models");
  // Render model detail view
  modelDetailView.render({id: id});
});
router.on('route:browse-model', function(id) {
  navselect("models");
  // Render model browse view
  modelBrowseView.render({id: id});
});
router.on('route:edit-site', function() {
  navselect("site");
  // Render site detail view
  siteDetailView.render();
});

// Init
init();
