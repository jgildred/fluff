// In case fluff.js is not running
if (!Fluff) {
  var Fluff = {admin : {}};
}
Fluff.admin.version = "0.9";

// Make sure the api key here matches the one in the site config if required
Fluff.apikey  = "1234567890";

// automatically run upon loading this js file
Fluff.admin.init = function () {
  
  // Display the version at the footer
  $(".attribution").html($(".attribution").html() + " " + Fluff.admin.version);

  // Prefilter for all ajax calls
  if (Fluff.apikey && (Fluff.apikey != '')) {
    $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
      // Modify options, control originalOptions, store jqXHR, etc
      options.headers = options.headers || {};
      options.headers['X-API-Key'] = encodeURIComponent(Fluff.apikey);
    });
  }
  checkSession(startRoutes);
};

// Returns a clone of the object or the same thing if not
var cloneObject = function (obj) {
  if ((null == obj) || ("object" != typeof obj)) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
};

var startRoutes = function (path) {
  console.log("Backbone history started");
  if (!Backbone.History.started) {
    if (!path) {
      path = '/fluff/admin';
    }
    Backbone.history.start({
      root: path
    });
  }
}

var checkSession = function (callback) {
  if (!session.get('user')) {
    session.fetch({
      success: function () {
        if (!session.get('user')) {
          console.log("Not logged in.");
          loginView.render(callback);
        }
        else {
          console.log("Logged in as " + session.get('user').email);
          if (session.get('user') && (session.get('user').role != "Admin")) {
            alertView.render({
              label:"Restricted", 
              msg: "Sorry, you need to be an admin to access this.", 
              onclose: 'login'
            });
          }
          else {
            $('title').html((session.get('site').name ? session.get('site').name : 'Site') + ' Admin');
            if (callback) {
              callback();
            }
          }
        }
      },
      error: function () {
        console.log("Check session error.");
        loginView.render(callback);
      }
    });
  }
  else {
    if (callback) {
      callback();
    }
  }
}

// Enumerations
var accessOptions = ['Public', 'Humans', 'Users', 'Owner', 'Admins'];

// Helper functions
var objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}
var htmlEncode = function (value) {
  return $('<div/>').text(value).html();
}
var flattenArray = function (objectArray, key) {
  var array = [];
  objectArray.forEach(function (object) {
    array.push(object[key]);
  });
  return array;
}
var humanize = function (string) {
  return string.replace("_", " ").toLowerCase();
}
var dehumanize = function (string) {
  return string.replace(" ", "_").toLowerCase();
}
var titleize = function (string) {
  var st = "";
  string.split(" ").forEach(function (part, index) {
    if (index > 0) st += " ";
    if (["id","url"].indexOf(part) > -1) {
      st += part.toUpperCase();
    }
    else {
      st += part.charAt(0).toUpperCase() + part.slice(1);
    }
  });
  return st;
}
// Useful when comparing schema attributes
var lowerCaseObject = function (obj) {
  var key,
      keys = Object.keys(obj);
  var n = keys.length;
  var newobj={};
  while (n--) {
    key = keys[n];
    newobj[dehumanize(key)] = obj[key];
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
var hacked_splice = function (index, howMany /* model1, ... modelN */) {
  var args  = _.toArray(arguments).slice(2).concat({at: index}),
    removed = this.models.slice(index, index + howMany);
  this.remove(removed).add.apply(this, args);
  return removed;
}

// show a log of events getting fired
var log_events = function (event, model) {
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

// Binds or unbinds a key to a function
var metaSave = function(on, callback) {
  if (on && callback) {
    $(window).bind('keydown',function(e){
      if (!( String.fromCharCode(e.which).toLowerCase() == 's' && e.metaKey)) {
        return true;
      }
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

var consolidateChildren = function (object) {
  if (object) {
    if (objectType(object) == 'Object') {
      var newObject = {};
      for (item in object) {
        if (item.split('.').length > 1) {
          var item_name    = item.split('.')[0];
          var subitem_name = item.substr(item_name.length + 1);
          // make sure the newObject has the subobject
          if (!newObject.hasOwnProperty(item_name)) {
            newObject[item_name] = {};
          }
          newObject[item_name] = addArrayOrString(newObject[item_name], subitem_name, object[item]);
        }
        else {
          // Add it to the newObject as a child array or string 
          newObject = addArrayOrString(newObject, item, object[item]);
        }
      }
      return newObject;
    }
    else {
      return object;
    }
  }
  else {
    return null;
  }
}

var consolidateArrays = function (object) {
  if (object) {
    if (objectType(object) == 'Object') {
      var newObject = {};
      for (item in object) {
        if ((item.split('[').length > 1) && (item.split(']').length > 1)) {
          var item_name  = item.split('[')[0];
          var item_index = parseInt(item.split('[')[1].split(']')[0]);
          if (item_index != NaN) {
            // take the item and make it an array with a new item
            // first check to see if the array already exists, if so add to it
            if (newObject[item_name]) {
              if (objectType(newObject[item_name]) == 'Array') {
                newObject[item_name].push(object[item]);
                delete object[item];
              }
              else {
                console.log("Form data has an array with same name as another element.");
              }
            }
            else {
              newObject[item_name] = [object[item]];
              delete object[item];
            }
          }
        }
        else {
          // Add it to the newObject as a child array or string 
          newObject[item] = object[item];
        }
      }
      return newObject;
    }
    else {
      return object;
    }
  }
  else {
    return null;
  }
}

// Grabs all form data and puts it into an object ready to update a resource.
// Form elements with a name like 'item.subitem' will be put into an 'item' subobject.
// Form elements with a name like 'items[]' will be parsed into an 'items' array of text.
// Form elements with a name like 'items[0].subitem' will be parsed into an 'items' array of objects.
// FIXME not proud of this code; this should ideally recurse beyond two levels deep
var formDataToObject = function (formData) {
  if (formData) {
    //console.log("SERIALIZED FORM DATA: " + JSON.stringify(formData));
    var formObject = {};
    // Consolidate children
    formObject = consolidateChildren(formData);
    for (item in formObject) {
      formObject[item] = consolidateChildren(formObject[item]);
    }
    //console.log("FORM DATA WITH CHILDREN: " + JSON.stringify(formObject));
    // Consolidate arrays of objects
    formObject = consolidateArrays(formObject);
    for (subitem in formObject) {
      if ((objectType(formObject[subitem]) == "Array") && (formObject[subitem].length > 0)) {
        var array = formObject[subitem];
        array.forEach(function (arrayItem, index) {
          array[index] = consolidateArrays(cloneObject(arrayItem));
        });
      }
      else {
        formObject[subitem] = consolidateArrays(formObject[subitem]);
      }
    }
    //console.log("FORM DATA WITH ARRAYS: " + JSON.stringify(formObject));
    return formObject;
  }
  else {
    return null;
  }
}

var getFormData = function (form) {
  if (form) {
    var formData = $(form).serializeObject();
  }
  return formDataToObject(formData);
}

// Test for the formDataToObject function
var tfo = function () {
  var data = {
    "id": "547ebb87a96bd50d1dcafcdd",
    "plugins[0].config[0].name": "id",
    "plugins[0].config[0].value": "asdf",
    "plugins[0].config[1].name": "key",
    "plugins[0].config[1].value": "sdf",
    "plugins[0].config[2].name": "assocId",
    "plugins[0].config[2].value": "sdf",
    "plugins[0].name": "AWS Plugin",
    "plugins[0].slug": "aws",
    "plugins[1].config[0].name": "something",
    "plugins[1].config[0].value": "sdf",
    "plugins[1].config[1].name": "something_else",
    "plugins[1].config[1].value": "sdf",
    "plugins[1].name": "Example Plugin",
    "plugins[1].slug": "example"
  };
  formDataToObject(data);
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
  if (!view.isEditView) {
    editor.commands.addCommand({
      name: 'toggleFullscreen',
      bindKey: {win: 'Esc',  mac: 'Esc'},
      exec: function(editor) {
        toggleFullscreen(editor);
      }
    });
  }
  if (view) {
    editor.targetView = view;
    if (fullscreen) {
      metaSave(true, function () {
        if (view.saveEditor) {
          view.saveEditor();
        } 
        else {
          view.submitForm();
        }
      });
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
function navselect (selection) {
  if (selection) {
    // if the navbar is already loaded then just select the tab
    if ($(".nav li#" + selection.toLowerCase() + "-tab").length > 0) {
      $("li.active").removeClass("active");
      $("li#" + selection.toLowerCase() + "-tab").addClass("active");
    }
    else {
      loadnavbar(selection);
    }
  }
}

// Load the navbar and authbar
function loadnavbar (selection) {
  if (session.get('user') && (session.get('user').role == 'Admin')) {
    $('header').removeClass('hidden');
    $('footer').removeClass('hidden');
    var template = _.template($('#navbar-template').html()); 
    $("nav").html(template);
    Fluff.admin.showUserLabel();
    if (selection) {
      navselect(selection);
    }
  }
}

// Display the user's name in the navbar
Fluff.admin.showUserLabel = function () {
  if ($(".authbar").length > 0) {
    if (session.get('user') && (session.get('user').role == 'Admin')) {
      var template = _.template($('#authbar-template').html(), {session: session});
      $(".authbar").html(template);
    }
  }
  else {
    loadnavbar();
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
var Site    = Backbone.Model.extend({
  url: apibase + '/site',
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

// Setup the signup view
var SignUpView = Backbone.View.extend({
  el: '#signup-modal',
  root: '.popup',
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
    $(this.root).html('');
    router.navigate('login');
  },
  render: function (options) {
    var template = _.template($('#signup-template').html(), {user: null});
    $(this.root).html(template);
    $('#signup-modal').modal('show');
  }
});

// Setup the login view
var LoginView = Backbone.View.extend({
  el: '.loginView',
  events: {
    'submit .login-form' : 'login'
  },
  login: function (ev) {
    var that = this;
    var loginDetails = getFormData(ev.currentTarget);
    session.login(loginDetails, function () {
      if (session.get("user")) {
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
            $('.modal').modal('hide');
            if (session.get("user").role == "Admin") {
              // Not sure why checking for this
              if (/#\/login/i.test(window.location.href) || /#login/i.test(window.location.href)) {
                pageListView.render();
              }
              else {
                if (that.callback) {
                  console.log("routing to destination");
                  that.callback();
                }
                else {
                  pageListView.render();
                }
              }
            }
            else {
              console.log("no admin");
              document.location.href = "/";
            }
            break;
        } 
      }
      else {
        $('.alert-msg').html('Login failed. Please try again.');
        $('.login-fail').show().delay(5000).fadeOut();
      }
    });
    return false;
  },
  render: function (callback) {
    if (callback) {
      console.log("see callback");
      this.callback = callback;
    }
    // make sure not to have a double backdrop
    $('.modal').modal('hide');
    var template = $('#login-template').html();
    this.$el.html(template);
    $(".alert").hide();
    this.$el.find('.modal').modal('show');
    this.$el.find('input[name=email]')[0].focus();
    return this;
  }
});

// Setup the password reset view
var PwresetView = Backbone.View.extend({
  el: '.pwresetView',
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
    this.$el.find('.modal').modal('show');
    this.$el.find('input')[0].focus();
  }
});

// Setup the password change view
var PwchangeView = Backbone.View.extend({
  el: '.pwchangeView',
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
    this.$el.find('.modal').modal('hide');
  },
  render: function (options) {
    var template = _.template($('#pwchange-template').html(), {token: (options && options.token) ? options.token : null}); 
    $(".modal-backdrop").remove();
    this.$el.html(template);
    this.$el.find('.modal').modal('show');
    this.$el.find('input')[0].focus();
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
    //navselect("pages");
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
    });
  },
  render: function () {
    this.vars = new Vars();
    var that = this;
    this.vars.fetch({
      success: function (vars) {
        var template = _.template($('#var-list-template').html(), {vars: vars.models});
        that.$el.html(template);
        if ($('.edit-var-quickform .edit-var-value').length > 0) {
          $('.edit-var-quickform .edit-var-value')[0].focus();
        }
      }
    });
  }
});

// Setup the var add view
var VarAddView = Backbone.View.extend({
  el: '#add-var-modal',
  root: '.popup',
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
    $(".modal-backdrop").remove();
    $(this.root).html(template);
    $('#add-var-modal').modal('show');
    $('.add-var-form .add-var-name')[0].focus();
  }
});

// Setup the model list view
var ModelListView = Backbone.View.extend({
  el: '.page',
  events: {
    'click .import-new' : 'importNewModel',
  },
  importNewModel: function () {
    importView.render(true);
  },
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
              url: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + dehumanize(model.get('name')) + '/count',
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
          console.log("user");
          console.log(user);
          var template = _.template($('#edit-user-template').html(), {user: user, role_options: that.role_options, status_options: that.status_options}); 
          that.$el.html(template);
        }
      })
    } 
    else {
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
    'submit .info-page-form'  : 'savePage',
    'click  .delete-page'     : 'deletePage',
    'click  .cancel'          : 'cancel',
    'click  .fullscreen-page' : 'fullscreenEditView'
  },
  fullscreenEditView: function (ev) {
    toggleFullscreen(this.editor);
  },
  submitForm: function () {
    $('.info-page-form').submit();
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
    this.access_options = accessOptions;
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
              var template = _.template($('#info-page-template').html(), {page: page, views: that.views, access_options: that.access_options, status_options: that.status_options});
              that.$el.html(template);
              that.editor = renderEditor('editor', that.page.get('content'), that.page.get('cursor'), null, that);
              $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
              $('.label-fse').html(that.page.get('name') + ' Content');
              $('.save-fullscreen-editor').click(that.submitForm);
              $('.close-fullscreen-editor').click(function() {
                toggleFullscreen(that.editor);
              });
            }
          });
        } else {
          // Open page detail for a new blank page
          that.page = null;
          var template = _.template($('#info-page-template').html(), {page: that.page, views: that.views, access_options: that.access_options, status_options: that.status_options});
          that.$el.html(template);
          that.editor = renderEditor('editor', null, { row: 0, column: 0 }, null, that);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.label-fse').html('Page Content');
          $('.save-fullscreen-editor').click(that.submitForm);
          $('.close-fullscreen-editor').click(function() {
            toggleFullscreen(that.editor);
          });
        }
      }
    });
  }
});

// Setup the full screen edit view
var FullScreenEditView = Backbone.View.extend({
  el: '#fullscreen-editor-container',
  isEditView: true,
  saveEditor: function () {
    var that = this;
    var modelDetails = {};
    modelDetails[this.dataField] = this.editor.getValue();
    modelDetails.cursor  = this.editor.selection.getCursor();
    this.model.save(modelDetails, {
      success: function (model) {
        if (that.type) {
          console.log(that.type + ' saved');
        }
        else {
          console.log('page saved');
        }
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  closeEditor: function () {
    this.saveEditor();
    window.history.back();
    $('#fullscreen-editor-container').addClass('hidden');
    $('.save-fullscreen-editor').unbind('click');
    $('.close-fullscreen-editor').unbind('click');
  },
  render: function (options) {
    if (options.id) {
      var that = this;
      if (options.type) {
        this.type = options.type;
      }
      if (this.type == 'view') {
        this.model = new View({_id: options.id});
      }
      else {
        this.model = new Page({_id: options.id});
      }
      this.model.fetch({
        success: function (model) {
          if (that.type == 'view') {
            that.dataField = 'template';
          }
          else {
            that.dataField = 'content';
          }
          that.editor = renderEditor('fullscreen-editor', that.model.get(that.dataField), that.model.get('cursor'), null, that, true);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.label-fse').html(that.model.get('name') + ' ' + titleize(humanize(that.dataField)));
          $('#fullscreen-editor-container').removeClass('hidden');
          $('.save-fullscreen-editor').click(function() {
            that.saveEditor();
          });
          $('.close-fullscreen-editor').click(function() {
            that.closeEditor();
          });
        }
      });
    }
  }
});

// Setup the view detail view
var ViewDetailView = Backbone.View.extend({
  el: '.page',
  events: {
    'submit .info-view-form' : 'saveView',
    'click  .delete-view'    : 'deleteView',
    'click  .cancel'         : 'cancel',
    'click  .fullscreen-view': 'fullscreenEditView'
  },
  fullscreenEditView: function (ev) {
    toggleFullscreen(this.editor);
  },
  submitForm: function () {
    $('.info-view-form').submit();
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
          var template = _.template($('#info-view-template').html(), {view: view, content_types: that.content_types}); 
          that.$el.html(template);
          that.editor = renderEditor('editor', that.view.get('template'), that.view.get('cursor'), null, that);
          $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
          $('.label-fse').html(that.view.get('name') + ' Template');
          $('.save-fullscreen-editor').click(that.submitForm);
          $('.close-fullscreen-editor').click(function() {
            toggleFullscreen(that.editor);
          });
        }
      })
    } else {
      this.view = null;
      var template = _.template($('#info-view-template').html(), {view: this.view, content_types: this.content_types});
      this.$el.html(template);
      this.editor = renderEditor('editor', null, { row: 0, column: 0 }, null, that);
      $('#fullscreen-editor-controlbar').html($('#editor-controlbar-template').html());
      $('.label-fse').html('View Template');
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
    this.access_options = accessOptions;
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
          $('.label-fse').html(that.model.get('name') + ' Schema');
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
      $('.label-fse').html('Model Schema');
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
    'click  .model-edit-view'   : 'editView',
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
    var that = this;
    var selections = [];
    var selection  = that.ht.getSelected();
    //console.log(selection);
    var lowSelection  = (selection[0] <= selection[2]) ? selection[0] : selection[2];
    var highSelection = (selection[0] <= selection[2]) ? selection[2] : selection[0];
    var models = [];
    for (var r = lowSelection; r <= highSelection; r++) {
      var dataRow = that.ht.getCellMeta(r,0).row;
      models.push(that.ht.getData().models[dataRow]);
    }
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
  editView: function () {
    router.navigate('models/' + this.model.id, {trigger: true});
  },
  arrangeColumns: function () {
    var availableColumns = [];
    for (attribute in this.schema) {
      availableColumns.push({
        name  : attribute,
        title : titleize(humanize(attribute)),
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
    this.access_options = accessOptions;
    var that = this;
    if (options.id) {
      // then get the model details
      this.model = new Model({_id: options.id});
      this.model.fetch({
        success: function (model) {
          that.ModelItem = Backbone.Model.extend({
            urlRoot: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + dehumanize(model.get('name')),
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
            url: adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + dehumanize(model.get('name')),
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
                // this lets us remember 'attr' for when it is get/set
                return {
                  data: function (modelItem, value) {
                    if (_.isUndefined(value)) {
                      var val = modelItem.get(attr);
                      if (!val && (that.schema[attr].name == 'Boolean')) {
                        val = false;
                      }
                      return val;
                    }
                    else {
                      modelItem.set(attr, value);
                      modelItem.save();
                    }
                  },
                  // FIXME more types
                  type: (that.schema[attr].name == 'Boolean') ? 'checkbox' : 
                    (
                      (that.schema[attr].name == 'Date') ? 'date' : 
                      null
                    ),
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
                  colHeaders.push((Object.prototype.hasOwnProperty.call(displayColumn, 'title')) ? displayColumn.title : displayColumn.name);
                  colWidths.push(displayColumn.size ? displayColumn.size : $("#model-data-grid").width()/Object.keys(that.schema).length);
                }
              });
              that.$container = $("#model-data-grid");
              that.ht = new Handsontable(that.$container[0], {
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
              // Add event listener to show delete button
              that.ht.addHook('afterSelection', function () {
                $('.delete-modelitems').show();
              });
              // Add event listener to hide delete button
              that.ht.addHook('afterDeselect', function () {
                ('.delete-modelitems').hide();
              });
              // Add event listener for afterColumnSort
              that.ht.addHook('afterColumnSort', function (index, order) {
                that.updateSortColumn(index, order);
              });
              // Apply sort
              that.displayColumns.forEach(function (displayColumn, index) {
                if (displayColumn.name == that.sortColumn.name) {
                  that.ht.sort(index, that.sortColumn.order);
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
          alertView.render({label: "Save Model", msg: $.parseJSON(xhr.responseText).msg});
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
          alertView.render({label: "Save Model", msg: $.parseJSON(xhr.responseText).msg});
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
          alertView.render({label: "Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
  }
});

// Setup the arrange columns view
var ArrangeColumnsView = Backbone.View.extend({
  el: '.arrangeColumnsView',
  events: {
    'click  .apply-columns'  : 'submit',
    'click  .cancel-arrange' : 'cancel'
  },
  submit: function (ev) {
    var newColumnNames = getFormData(this.form).display_columns;
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
          title : titleize(humanize(columnName)),
          size  : 100
        });
      }
    });
    modelBrowseView.displayColumns = displayColumns;
    modelBrowseView.model.save({display_columns: modelBrowseView.displayColumns}, {
      patch: true,
      success: function (model) {
        console.log('display columns saved');
        //window.location.reload();
        //FIXME column move not working after return to model browse view
        modelBrowseView.render({id: model.id});
        $('.modal').modal('hide');
      },
      error: function (model, xhr) {
        console.log(xhr);
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label:"Save Model", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
  },
  cancel: function () {
    $('.modal').modal('hide');
  },
  render: function (availableColumns, displayColumns) {
    var that = this;
    var template = _.template($('#arrange-columns-template').html(), {available_columns: availableColumns, display_columns: displayColumns});
    $('.modal').modal('hide');
    this.$el.html(template);
    this.form = this.$el.find('form')[0];
    this.$el.find('.modal').modal('show');
    // Hitting enter key while in the form will submit.
    this.$el.bind('keypress', function(e){
      if (e.keyCode == 13) {
        e.preventDefault();
        that.submit();
      }
    });
  }
});

// Setup the import view
var ImportView = Backbone.View.extend({
  el: '.importView',
  events: {
    'click  input[type=radio]'   : 'pickSource',
    'change .show-options'       : 'showOptions',
    'click  .btn-import'         : 'submit',
    'click  .cancel-import'      : 'cancel'
  },
  pickSource: function (ev) {
    switch (true) {
      case $(ev.currentTarget).hasClass('import-file'):
        $('div.import-file').show();
        $('div.import-url').hide();
        break;
      case $(ev.currentTarget).hasClass('import-url'):
        $('div.import-url').show();
        $('div.import-file').hide();
        break;
      default:
    }
  },
  showOptions: function (ev) {
    if (ev.currentTarget.checked) {
      $('div.import-delimiter').show();
      $('div.import-fieldset').show();
    }
    else {
      $('div.import-delimiter').hide();
      $('div.import-fieldset').hide();
    }
  },
  submit: function (ev) {
    var data, formData = getFormData(this.form);
    delete formData['ignore'];
    var contentType = 'application/json';
    var file = this.$el.find('input[name=file]')[0].files[0];
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
      // FIXME this may not be necessary
      data = JSON.stringify(formData);
    }
    // If this is for creating a new model, then POST to /models
    // Otherwise POST to the specific models resource
    var name = this.$el.find('input[name=name]')
    if (name && (name.length > 0) && (name.val() != "")) {
      var url = adminbase + 'api/models';
      var onclose  = "models";
      var forModel = true;
    }
    else {
      var url = adminbase.slice(0, adminbase.indexOf('admin') - 1) + '/api/' + dehumanize(modelBrowseView.model.get('name')) + "/import";
      var onclose  = "models/" + modelBrowseView.model.id + "/browse";
      var forModel = false;
    }
    console.log(data);
    $.ajax({
      data: data,
      cache: false,
      contentType: contentType,
      processData: false,
      type: "POST",
      url: url,
      success: function () {
        if (forModel) {
          modelListView.render();
        }
        else {
          //FIXME column move not working after return to model browse view
          //window.location.reload();
          modelBrowseView.modelItems.reset();
          modelBrowseView.render({id: modelBrowseView.model.id});
        }
        $('.modal').modal('hide');
        alertView.render({label: "Import complete", msg: "Import was successful.", onclose: onclose});
      },
      error: function (xhr) {
        $('.modal').modal('hide');
        if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
          alertView.render({label: "Import problem", msg: $.parseJSON(xhr.responseText).msg});
        }
      }
    });
    return false;
  },
  cancel: function () {
    $('.modal').modal('hide');
  },
  render: function (createModel) {
    var template = _.template($('#import-template').html());
    $('.modal').modal('hide');
    this.$el.html(template);
    this.form = this.$el.find('form')[0];
    if (createModel) {
      $('.import-form .model-name').show();
    }
    this.$el.find('.modal').modal('show');
    // Hitting enter key while in the form will submit.
    this.$el.bind('keypress', function(e){
      if (e.keyCode == 13) {
        e.preventDefault();
        that.submit();
      }
    });
  }
});

// Setup the notifications view
var NotificationsView = Backbone.View.extend({
  el: '.page',
  events: {
    'change #selectNotification'      : 'showNotification',
    'submit .edit-notifications-form' : 'saveNotification'
  },
  showNotification: function () {
    var name = $('#selectNotification').val();
    $('.notification-info').addClass('hidden');
    $('#notification-' + name).removeClass('hidden');
    var focus_input = $('#notification-' + name + ' input');
    if (focus_input.length > 0) {
      focus_input[0].focus();
    }
  },
  saveNotification: function (ev) {
    // TBD should only save the changed notification
    var siteDetails = getFormData(ev.currentTarget);
    if (!this.site) {
      this.site = new Site();
    }
    if (siteDetails) {
      console.log(siteDetails);
      this.site.save(siteDetails, {
        patch: true,
        success: function (notification) {
          console.log('notification saved');
          alertView.render({label:"OK", msg: "Notification has been updated.", onclose: "notifications"});
        },
        error: function (model, xhr) {
          console.log(xhr);
          if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
            alertView.render({label:"Problem", msg: $.parseJSON(xhr.responseText).msg});
          }
        }
      });
    }
    else {
      alertView.render({label:"Update Notification", msg: "Nothing to update."});
    }
    return false;
  },
  render: function () {
    // build the form to edit notifications
    var that = this;
    if (!this.site) {
      this.site = new Site();
      this.site.fetch({
        success: function (site) {
          that.notifications = site.get('notifications');
          var template = _.template($('#edit-notifications-template').html(), {notifications: that.notifications, site: site});
          that.$el.html(template);
          that.showNotification('signup');
          var focus_input = $('#notification-signup input');
          if (focus_input.length > 0) {
            focus_input[0].focus();
          }
        }
      });
    } else {
      this.notifications = this.site.get('notifications');
      var template = _.template($('#edit-notifications-template').html(), {notifications: this.notifications, site: this.site});
      this.$el.html(template);
      this.showNotification('signup');
      var focus_input = $('#notification-signup input');
      if (focus_input.length > 0) {
        focus_input[0].focus();
      }
    }
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
              $('title').html((session.get('site') ? session.get('site').name : 'Site') + ' Admin');
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
            alertView.render({label:"Problem", msg: $.parseJSON(xhr.responseText).msg});
          }
        }
      });
    }
    else {
      alertView.render({label:"Update Site", msg: "Nothing to update."});
    }
    return false;
  },
  render: function () {
    
    // build the list of cors mode options
    this.cors_mode_options = ['Allow All', 'White List'];
    // build the list of smtp service options
    this.smtp_service_options = [ "SMTP", "Gmail", "DynectEmail", "hot.ee", "Hotmail", "iCloud", "mail.ee", "Mail.Ru", "Mailgun", "Mailjet", "Mandrill", "Postmark", "QQ", "SendGrid", "SES", "Yahoo", "yandex", "Zoho" ];
    var that = this;
    if (!this.site) {
      this.site = new Site();
      this.site.fetch({
        success: function (site) {
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

// Setup the plugins view
var PluginsView = Backbone.View.extend({
  el: '.page',
  events: {
    'change #selectPlugin'      : 'showPlugin',
    'submit .edit-plugins-form' : 'savePlugin'
  },
  showPlugin: function () {
    var name = $('#selectPlugin').val();
    $('.plugin-info').addClass('hidden');
    $('#plugin-' + name).removeClass('hidden');
    var focus_input = $('#plugin-' + name + ' input');
    if (focus_input.length > 0) {
      focus_input[0].focus();
    }
  },
  savePlugin: function (ev) {
    // TBD should only save the changed plugin
    var siteDetails = getFormData(ev.currentTarget);
    if (!this.site) {
      this.site = new Site();
    }
    if (siteDetails) {
      console.log("OBJECT TO SAVE:");
      console.log(siteDetails);
      this.site.save(siteDetails, {
        patch: true,
        success: function (plugin) {
          console.log('plugin saved');
          console.log(plugin.attributes);
          alertView.render({label:"OK", msg: "Plugin has been updated.", onclose: "plugins"});
        },
        error: function (model, xhr) {
          console.log(xhr);
          if (xhr && xhr.responseText && $.parseJSON(xhr.responseText).msg) {
            alertView.render({label:"Problem", msg: $.parseJSON(xhr.responseText).msg});
          }
        }
      });
    }
    else {
      alertView.render({label:"Update Plugin", msg: "Nothing to update."});
    }
    return false;
  },
  render: function () {
    // build the form to edit plugins
    var that = this;
    if (!this.site) {
      this.site = new Site();
      this.site.fetch({
        success: function (site) {
          that.plugins = site.get('plugins');
          var template = _.template($('#edit-plugins-template').html(), {plugins: that.plugins, site: site});
          that.$el.html(template);
          that.showPlugin();
          var focus_input = $('.plugin-field input');
          if (focus_input.length > 0) {
            focus_input[0].focus();
          }
        }
      });
    } else {
      this.plugins = this.site.get('plugins');
      var template = _.template($('#edit-plugins-template').html(), {plugins: this.plugins, site: this.site});
      this.$el.html(template);
      this.showPlugin();
      var focus_input = $('.plugin-field input');
      if (focus_input.length > 0) {
        focus_input[0].focus();
      }
    }
  }
});

// Setup the generic alert link view
var AlertView = Backbone.View.extend({
  el: '#alert-modal',
  root: '.popup',
  events: {
    'click .close' : 'close'
  },
  close: function () {
    // accepts the name of a route to go to after close
    if (this.onclose) {
      router.navigate(this.onclose);
    }
  },
  render: function (options) {
    //$('.modal-backdrop').remove();
    var template = _.template($('#alert-template').html(), {label: options.label, msg: options.msg});
    $(".modal-backdrop").remove();
    $(this.root).html(template);
    $('#alert-modal').modal('show');
    if (options && options.onclose) {
      this.onclose = options.onclose;
      if (options && options.callback) {
        options.callback();
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
var pageListView         = new PageListView();
var pageDetailView       = new PageDetailView();
var fullScreenEditView   = new FullScreenEditView();
var viewListView         = new ViewListView();
var viewDetailView       = new ViewDetailView();
var varListView          = new VarListView();
var varAddView           = new VarAddView();
var modelListView        = new ModelListView();
var modelDetailView      = new ModelDetailView();
var modelBrowseView      = new ModelBrowseView();
var arrangeColumnsView   = new ArrangeColumnsView();
var importView           = new ImportView();
var userListView         = new UserListView();
var userDetailView       = new UserDetailView();
var notificationsView    = new NotificationsView();
var siteDetailView       = new SiteDetailView();
var pluginsView          = new PluginsView();

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
      "verify/:token"     : "verify-email",
      "pages"             : "list-pages",
      "pages/new"         : "info-page",
      "pages/:id"         : "info-page",
      "pages/:id/edit"    : "edit-page",
      "views"             : "list-views",
      "views/new"         : "info-view",
      "views/:id"         : "info-view",
      "views/:id/edit"    : "edit-view",
      "vars"              : "list-vars",
      "vars/new"          : "add-var",
      "models"            : "list-models",
      "models/new"        : "edit-model",
      "models/:id"        : "edit-model",
      "models/:id/browse" : "browse-model",
      "users"             : "list-users",
      "users/new"         : "edit-user",
      "users/:id"         : "edit-user",
      "notifications"     : "edit-notifications",
      "site"              : "edit-site",
      "plugins"           : "edit-plugins"
    }
});

// Setup the behavior for each route event
var router = new Router;
router.on('route:home', function() {
  console.log("home route");
  pageListView.render();
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
  console.log("users route");
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
  console.log("pages route");
  navselect("pages");
  // Render page list view
  pageListView.render();
});
router.on('route:info-page', function(id) {
  navselect("pages");
  // Render page detail view
  pageDetailView.render({id: id});
});
router.on('route:edit-page', function(id) {
  navselect("pages");
  // Render edit view
  fullScreenEditView.render({id: id, type: 'page'});
});
router.on('route:list-views', function() {
  navselect("views");
  // Render view list view
  viewListView.render();
});
router.on('route:info-view', function(id) {
  navselect("views");
  // Render view detail view
  viewDetailView.render({id: id});
});
router.on('route:edit-view', function(id) {
  navselect("views");
  // Render edit view
  fullScreenEditView.render({id: id, type: 'view'});
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
router.on('route:edit-notifications', function() {
  navselect("notifications");
  // Render notifications view
  notificationsView.render();
});
router.on('route:edit-site', function() {
  navselect("site");
  // Render site detail view
  siteDetailView.render();
});
router.on('route:edit-plugins', function() {
  navselect("plugins");
  // Render plugins view
  pluginsView.render();
});

// Init
Fluff.admin.init();
