
// The only global
var fluff = {
	version     : "0.8",
	session     : {},
	models      : {},
	schemas     : {},
	collections : [],
	views       : [],
	path        : "/fluff",    // This must match the fluff site configuration.
	apikey      : "1234567890" // Leave as null or empty string if not required.
};

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

// Helper function
fluff.objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

// Useful when comparing schema attributes
fluff.lowerCaseObject = function (obj) {
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

fluff.dataToSchema = function (data) {
	if (data) {
		var ObjectId = String,
	      Buffer   = String,
	      Mixed    = String;
	  console.log("evaling schema: " + data);
	  eval("var schema = " + data + ";");
	  schema = fluff.lowerCaseObject(schema);
	  schema._id            = String;
	  schema.creator_id     = String;
	  schema.lastupdater_id = String;
	  schema.creation       = Date;
	  schema.lastupdate     = Date;
	  return schema;
	}
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

fluff.addModel = function (modelName) {
	if (fluff.models[modelName] == undefined ) {
		var Model = Backbone.Model.extend({
			urlRoot: fluff.path + '/api/' + modelName
		});
		fluff.models[modelName] = Model;
		console.log("Added a model to fluff: " + modelName);
	}
	else {
		var Model = fluff.models[modelName];
	}
	return Model;
}

fluff.addSchema = function (modelName, callback) {
	if (fluff.schemas[modelName] == undefined ) {
		$.ajax({
			type: 'GET',
			url: fluff.path + '/api/' + modelName + '/schema',
			dataType: 'json',
			success : function (data, status, xhr) {
				if (data) {
					var Schema = fluff.dataToSchema(data);
					fluff.schemas[modelName] = Schema;
			  	console.log("Added a schema to fluff: " + modelName);
				}
				if (callback) {
					callback();
				}
			}
		});
	}
	else {
		return fluff.schemas[modelName];
	}
}

fluff.drawTableHeader = function (model) {
	var html = "";
	var fields = model.toJSON();
	for (field in fields) {
			html += "<th>" + field + "</th>";
	}
	return html;
}

fluff.renderFields = function (model, template) {
	var fields = model.toJSON();
	if (template) {
		var templateObj = $(template);
		var elements = templateObj.find('[field]');
		elements.each(function (i) {
			var element = $(elements[i]);
			if (fields[element.attr('field').toLowerCase()] != undefined) {
				element.html(fields[element.attr('field').toLowerCase()]);
			}
		});
		return templateObj.wrap('<p>').parent().html();
	}
	else {
		return null;
	}
}

fluff.autoRenderFields = function (model, elementType, dividerHtml) {
	dividerHtml = dividerHtml ? dividerHtml : '';
	var fields = model.toJSON();
	var html = "";
	var count = 0;
	var second = false;
	for (field in fields) {
		count++;
		if (count > 1) {
			html += dividerHtml;
		}
		switch (elementType) {
		case 'img':
			html += "<" + elementType + " field='" + field + "' src='" + fields[field] + "'/>";
			break;
		default:
			html += "<" + elementType + " field='" + field + "'>" + fields[field] + "</" + elementType + ">";
		}
	}
	return html;
}

fluff.harvestElements = function () {
	var tags  = ["div", "span", "ul", "ol"];
	var elements = $(tags.join("[model], ") + "[model]");
  elements.each(function (e) {
  	var element = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelNameInElement = element.attr('model');
  	var modelName = modelNameInElement.split("/")[0].toLowerCase();
  	var Model = fluff.addModel(modelName);
		if (element.attr('filter')) {
			// tbd
		}
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.path + '/api/' + modelNameInElement.toLowerCase()
		});
		var collection = new Collection();
		fluff.collections.push(collection);
		console.log("Added a collection of " + modelName + " to fluff." );
		var View = Backbone.View.extend({
			collection: collection,
			el: element,
			template: null,
			initialize: function() {
				var that = this;
			  this.collection.fetch({
			  	success: function () {
			  		that.render();
			  	}
			  })
			},
			render: function() {
				var elementObj = $(this.$el);
				// If there is at least one li then use the first one as a template
				var rowTemplate = null;
				var filltag = type + '[template]';
				if ((type == 'ul') || (type == 'ol')) {
					filltag = 'li';
				}
				console.log("filling a:");
				console.log(type + " with " + filltag);
				var fts = elementObj.find(filltag);
				if (fts.toArray().length > 0) {
					var rowTemplate = fts.first().get(0).outerHTML;
					fts.first().remove();
				}
				// Build the set of children
				var bodyHtml = "";
				this.collection.forEach(function(model) {
					if (rowTemplate) {
						bodyHtml += fluff.renderFields(model, rowTemplate) + "\n";
					}
					else {
						bodyHtml += "<" + filltag.split('[')[0] + ">" + fluff.autoRenderFields(model, 'span', ', ') + "</" + filltag.split('[')[0] + ">\n";
					}
				});
				elementObj.append(bodyHtml);
			}
		});
		var view = new View();
    fluff.views.push(view);
	});
}

fluff.harvestTables = function () {
	var tables = $("table[model]");
  tables.each(function (t) {
  	var table = $(this);
  	var modelNameInTable = table.attr('model');
  	var modelName = modelNameInTable.toLowerCase();
  	var Model = fluff.addModel(modelName);
		if (table.attr('filter')) {
			// tbd
		}
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.path+ '/api/' + modelName
		});
		var collection = new Collection();
		fluff.collections.push(collection);
		console.log("Added a collection of " + modelName + " to fluff." );
		var View = Backbone.View.extend({
			collection: collection,
			el: table,
			template: null,
			initialize: function() {
				var that = this;
				that.collection.fetch({
			  	success: function () {
			  		that.render();
			  	}
			  });
			},
			render: function() {
				var elementObj = $(this.$el);
				// Build the header if none
				var ths = elementObj.find('tr th');
				if (ths.toArray().length == 0) {
					var headHtml = "<tr>" + fluff.drawTableHeader(this.collection.first()) + "</tr>";
				}
				else {
					var headHtml = ths.first().parent().get(0).outerHTML;
					ths.first().parent().remove();
				}
				// If there is already one or more theads, then insert into the first one
				var thead = elementObj.find('thead');
				if (thead.toArray().length > 0) {
					thead.first().append(headHtml);
				}
				else {
					elementObj.append("\n<thead>\n" + headHtml + "\n</thead>\n");
				}
				// If there is at least one data row then use the first one as a template
				var rowTemplate = null;
				var tds = elementObj.find('tr td');
				if (tds.toArray().length > 0) {
					var rowTemplate = tds.first().parent().get(0).outerHTML;
					tds.first().parent().remove();
				}
				else {
					if (elementObj.find('tbody').toArray().length == 0) {
						elementObj.append("<tbody>\n</tbody>");
					}
				}
				// Build the body rows
				var bodyHtml = "\n";
				this.collection.forEach(function(model) {
					if (rowTemplate) {
						bodyHtml += fluff.renderFields(model, rowTemplate) + "\n";
					}
					else {
						bodyHtml += "<tr>" + fluff.autoRenderFields(model, 'td') + "</tr>\n";
					}
				});
				elementObj.find('tbody').first().append(bodyHtml + "\n");
			}
		});
		var view = new View();
    fluff.views.push(view);
  });
}

fluff.harvestForms = function () {
	var forms = $("form[model]");
  forms.each(function (f) {
  	console.log("Processing a form...");
  	var form = $(this);
  	var modelNameInForm = form.attr('model');
  	var modelName = modelNameInForm.split('/')[0].toLowerCase();
  	var modelId = null;
  	console.log("see a model: " + modelName);
  	if (modelNameInForm.split('/').length > 1) {
  		modelId = modelNameInForm.split('/')[1];
  		console.log("with ID: " + modelId);
  	}
  	var Model = fluff.addModel(modelName);
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.path + '/api/' + modelName
		});
		var collection = new Collection();
		fluff.collections.push(collection);
		console.log("Added a collection of " + modelName + " to fluff." );
		var reg  = new RegExp(modelNameInForm, "gi");
		var View = Backbone.View.extend({
			collection: collection,
			el: form,
			template: null,
  		events: {
    		'click .submit' : 'submit'
  		},
			initialize: function() {
				var that = this;
				if (modelId) {
					this.model = new Model({
						_id: modelId
					});
					fluff.addSchema(modelName, function () {
						that.model.fetch({
					  	success: function () {
					  		that.render();
					  	}
					  });
					});
				}
				else {
					fluff.addSchema(modelName, function () {
					  that.render();
					});
				}
			},
			submit: function (ev) {
				var that = this;
				var modelDetails = getFormData($(ev.currentTarget).parents("form:first"));
				if (!this.model) {
					this.model = new Model();
				}
				this.model.save(modelDetails, {
      		patch: true,
      		success: function (model) {
      			console.log(modelName + " saved.");
		      },
		      error: function (model, xhr) {
		        console.log(xhr);
						that.model.fetch({
					  	success: function () {
					  		that.render();
					  	}
					  });
					}
				});
			},
			render: function () {
				var elementObj = $(this.$el);
				var schema = fluff.lowerCaseObject(fluff.schemas[modelName]);
				var html = '';
				for (field in schema) {
					switch (schema[field].name) {
						case 'String':
							html += '<input type="text" name="' + field + '" value="' + ((this.model && this.model.get(field)) ? this.model.get(field) : '') + '" placeholder="' + field + '" />\n';
							break;
						case 'Number':
							html += '<input type="number" name="' + field + '" value="' + ((this.model && this.model.get(field)) ? this.model.get(field) : '') + '" placeholder="' + field + '" />\n';
							break;
						case 'Date':
							html += '<input type="datetime" name="' + field + '" value="' + ((this.model && this.model.get(field)) ? this.model.get(field) : '') + '" placeholder="' + field + '" />\n';
							break;
						case 'Boolean':
							html += '<input type="checkbox" name="' + field + '" value="' + ((this.model && this.model.get(field)) ? this.model.get(field) : 'false') + '"' + ((this.model && this.model.get(field)) ? ' checked' : '') + ' />\n';
							break;
						case 'Array':
							html += '<input type="text" name="' + field + '" value="' + ((this.model && (this.model.get(field).length > 0)) ? this.model.get(field).join(',') : '') + '" placeholder="' + field + '" />\n';
							break;
						default:
							break;
					}
				}
				html += '<button type="button" class="submit">Submit</button>';
				elementObj.append(html + "\n");
				// Hitting enter key while in the form will submit.
				elementObj.bind('keypress', function(e){
   				if (e.keyCode == 13) {
     				$(this).find('.submit:first').click();
   				}
 				});
			}
		});
		var view = new View();
    fluff.views.push(view);
	});
}

fluff.Session = Backbone.Model.extend({
  urlRoot: fluff.path + '/admin/api/auth',
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
  login: function(credentials, options) {
    // Do a POST to /auth and send the serialized form creds
    this.save(credentials, {
      success: options.success,
      error: options.error
    });
  },
  logout: function(callback) {
    // Do a DELETE to /auth and clear the clientside data
    var that = this;
    this.destroy({
      success: function (model, resp) {
        model.clear();
        model.id = null;
        callback();
      },
      error: callback
    });
  }
});

fluff.checkSession = function () {
	fluff.session = new fluff.Session();
	fluff.session.fetch({
    success: function () {
    	console.log("Logged in as " + fluff.session.get('user').email);
      Backbone.history.start();
    },
    error: function (xhr) {
      console.log(xhr);
      Backbone.history.start();
    }
  });
}

fluff.harvestSelects = function () {
	// tbd
}

fluff.harvestLogins = function () {
	var forms = $("form[auth]");
  forms.each(function (f) {
  	console.log("Processing an auth form...");
  	var form = $(this);
  	var modelName = 'user';
		var View = Backbone.View.extend({
			el: form,
			template: null,
  		events: {
    		'click .submit' : 'submit'
  		},
			initialize: function() {
				var that = this;
				this.render();
			},
			submit: function (ev) {
				var loginDetails = getFormData($(ev.currentTarget).parents("form:first"));
				if ($.isEmptyObject(fluff.session)) {
					fluff.session = new fluff.Session();
				}
				fluff.session.login(loginDetails, {
      		success: function (model) {
      			console.log("Logged in.");
		      },
		      error: function (model, xhr) {
		        console.log(xhr);
					}
				});
			},
			render: function () {
				var elementObj = $(this.$el);
				var html = '<input type="text" name="email" value="" placeholder="Email" />\n';
				html += '<input type="password" name="password" value="" placeholder="Password" />\n';
				html += '<button type="button" class="submit">Login</button>';
				elementObj.append(html + "\n");
				// Hitting enter key while in the form will submit.
				elementObj.bind('keypress', function(e){
   				if (e.keyCode == 13) {
     				$(this).find('.submit:first').click();
   				}
 				});
			}
		});
		var view = new View();
    fluff.views.push(view);
	});
}

// Build the models and collections and render the views
fluff.init = function (options) {
	if (fluff.apikey && (fluff.apikey != '')) {
		// prefilter for all ajax calls
	  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
	    // Modify options, control originalOptions, store jqXHR, etc
	    options.headers = options.headers ? options.headers : {};
	    options.headers['X-API-Key'] = encodeURIComponent(fluff.apikey);
	  });
	}
	this.harvestElements();
	this.harvestTables();
	this.harvestForms();
	this.harvestSelects();
	this.harvestLogins();
	// Run the ready state callback
  if (options.ready) {
    options.ready();
  }
}
