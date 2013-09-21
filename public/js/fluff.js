
// The only global
var fluff = {
	version     : "0.8",
	session     : {},
	models      : {},
	collections : {},
	views       : {},
	path        : "/fluff",    // This must match the fluff site configuration.
	apikey      : "1234567890" // Leave as null or empty string if not required.
};

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

// Helper function
fluff.objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

fluff.log = function (msg, obj) {
	if (msg) {
		console.log(msg);
	}
	if (obj) {
		console.log(obj);
	}
}

fluff.flattenArray = function (objectArray, key) {
  var array = [];
  objectArray.forEach(function (object) {
    array.push(object[key]);
  });
  return array;
}

fluff.dehumanize = function (string) {
  return string.replace(" ", "_").toLowerCase();
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
  // Make sure any checkboxes with false values are included
  var boxes = this.find('input[type=checkbox][value=false]');
  boxes.each(function () {
  	a.push({
  		name  : $(this).attr('name'),
  		value : $(this).val()
  	});
  });
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

fluff.addCollection = function (options) {
	var modelName = options.modelName;
	// FIXME need to have name include filter
	var name = modelName,
			path = modelName;
	if (options.id) {
		name += "/" + options.id;
		path = name;
	}
	else {
		if (options.filter && fluff.filters[options.filter]) {
			name += ":" + options.filter;
			path += "?filter=" + fluff.filters[options.filter];
		}
	}
	if (fluff.collections[name] == undefined) {
		var Model = Backbone.Model.extend({
			urlRoot: fluff.path + '/api/' + modelName
		});
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.path + '/api/' + path // FIXME need to add filter here
		});
		var collection = new Collection();
		fluff.collections[name] = collection;
		fluff.log("Added a collection to fluff: " + name);
	}
	else {
		var collection = fluff.collections[name];
	}
	return collection;
}

fluff.addModel = function (name, callback) {
	if (fluff.models[name] == undefined) {
		$.ajax({
			type: 'GET',
			url: fluff.path + '/api/' + name + '/info',
			dataType: 'json',
			success : function (data, status, xhr) {
				if (data && (fluff.models[name] == undefined)) {
					var Schema = fluff.dataToSchema(data.schema_data);
					fluff.models[name] = {
						schema          : Schema,
						display_columns : data.display_columns,
						column_sort     : data.column_sort
					};
			  	fluff.log("Added a model to fluff: " + name);
				}
				if (callback) {
					callback();
				}
			}
		});
	}
	else {
		if (callback) {
			callback();
		}
	}
}

fluff.addView = function (type, element, View) {
	var view = new View();
	var viewName = type + "[model=" + element.attr('model') + "]";
	if (element.attr('id')) {
			viewName = type + "#" + element.attr('id');
		}
	// FIXME careful not to overwrite existing views
  fluff.views[viewName] = view;
}

fluff.drawTableHeader = function (modelInfo) {
	var html = "";
	modelInfo.display_columns.forEach(function (column) {
		html += "<th>" + column.title + "</th>";
	});
	return html;
}

fluff.renderFields = function (model, template) {
	var fields = model.toJSON();
	if (template) {
		var templateObj = $('<div></div>');
		$(template).appendTo(templateObj);
		var elements = templateObj.find('[field]');
		elements.each(function () {
			var element = $(this);
			var type = this.nodeName.toLowerCase();
			var field = fields[fluff.dehumanize(element.attr('field'))];
			if (field != undefined) {
				switch (type) {
					case 'input':
						if (element.attr('type') == 'text') {
							element.attr('value', field);
						}
						if (element.attr('type') == 'checkbox') {
							element.attr('value', field);
							if (field) {
								this.checked = true;
							}
							else {
								this.checked = false;
							}
						}
						break;
					default:
						element.html(field);
				}
			}
		});
		return templateObj.html();
	}
	else {
		return "";
	}
}

fluff.autoRenderFields = function (model, modelInfo, elementType, dividerHtml) {
	dividerHtml = dividerHtml ? dividerHtml : '';
	var modelData = model.toJSON();
	var html = "";
	var count = 0;
	var second = false;
	modelInfo.display_columns.forEach(function (field) {
		count++;
		if ((count > 1) && dividerHtml) {
			html += dividerHtml;
		}
		switch (elementType) {
		case 'img':
			html += '<' + elementType + ' field="' + field.name + '" src="' + modelData[field.name] + '"/>';
			break;
		default:
			html += '<' + elementType + ' field="' + field.name + '">' + modelData[field.name] + '</' + elementType + '>';
		}
	});
	return html;
}

fluff.harvestElements = function () {
	var tags  = ["div", "span", "ul", "ol"];
	var elements = $(tags.join("[model], ") + "[model]");
  elements.each(function (e) {
  	var element = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelName = element.attr('model');
  	var modelId   = null;
  	var filter    = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (element.attr('filter')) {
			filter = element.attr('filter');
		}
		var collection = fluff.addCollection({
			modelName : modelName,
			id        : modelId,
			filter    : filter
		});
		var View = Backbone.View.extend({
			el: element,
			initialize: function() {
				var that = this;
			  collection.fetch({
			  	success: function () {
			  		fluff.addModel(modelName, function () {
			  			that.render();
			  		});
			  	}
			  });
			},
			render: function() {
				var elementObj = $(this.el);
				// If there is at least one li then use the first one as a template
				var rowTemplate = null;
				var filltag = type + '[template]';
				if ((type == 'ul') || (type == 'ol')) {
					filltag = 'li';
				}
				var fts = elementObj.find(filltag);
				if (fts.toArray().length > 0) {
					var rowTemplate = fts.first().get(0).outerHTML;
					fts.first().remove();
				}
				// Build the set of children
				var bodyHtml = "";
				collection.forEach(function (model) {
					if (rowTemplate) {
						bodyHtml += fluff.renderFields(model, rowTemplate) + "\n";
					}
					else {
						var tag = filltag.split('[')[0];
						bodyHtml += "<" + tag + ">" + fluff.autoRenderFields(model, fluff.models[modelName], 'span', ', ') + "</" + tag + ">\n";
					}
				});
				elementObj.append(bodyHtml);
			}
		});
		fluff.addView(type, element, View);
	});
}

fluff.harvestTables = function () {
	var tables = $("table[model]");
  tables.each(function (t) {
  	var table = $(this);
  	var modelName = table.attr('model');
  	var modelId   = null;
  	var filter    = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (table.attr('filter')) {
			filter = table.attr('filter');
		}
		var collection = fluff.addCollection({
			modelName : modelName,
			id        : modelId,
			filter    : filter
		});
		var View = Backbone.View.extend({
			el: table,
			initialize: function() {
				var that = this;
				collection.fetch({
			  	success: function () {
			  		fluff.addModel(modelName, function () {
			  			that.render();
			  		});
			  	}
			  });
			},
			render: function() {
				var elementObj = $(this.el);
				// Build the header if none
				var ths = elementObj.find('tr th');
				if (ths.toArray().length == 0) {
					var headHtml = "<tr>" + fluff.drawTableHeader(fluff.models[modelName]) + "</tr>";
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
				collection.forEach(function(model) {
					if (rowTemplate) {
						bodyHtml += fluff.renderFields(model, rowTemplate) + "\n";
					}
					else {
						bodyHtml += "<tr>" + fluff.autoRenderFields(model, fluff.models[modelName], 'td') + "</tr>\n";
					}
				});
				elementObj.find('tbody').first().append(bodyHtml + "\n");
			}
		});
		fluff.addView("table", table, View);
  });
}

fluff.harvestForms = function () {
	var forms = $("form[model]");
  forms.each(function (f) {
  	var form = $(this);
  	var modelName = form.attr('model');
  	var modelId   = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
  	var Model = Backbone.Model.extend({
			urlRoot: fluff.path + '/api/' + modelName
		});
		var View = Backbone.View.extend({
			el: form,
  		events: {
  			'change [type=checkbox]' : 'changeCheckbox',
    		'click  .submit'         : 'submit'
  		},
			initialize: function() {
				var that = this;
				if (modelId) {
					this.model = new Model({
						_id: modelId
					});
					this.model.fetch({
				  	success: function () {
				  		fluff.addModel(modelName, function () {
			  				that.render();
			  			});
				  	}
				  });
				}
				else {
					fluff.addModel(modelName, function () {
			  		that.render();
			  	});
				}
			},
			changeCheckbox: function (ev) {
				var checkbox = $(ev.currentTarget);
				if (checkbox.prop('checked')) {
					checkbox.val('true');
				}
				else {
					checkbox.val('false');
				}
			},
			submit: function (ev) {
				var that = this;
				var modelDetails = getFormData($(ev.currentTarget).parents("form:first"));
				if (!this.model) {
					this.model = new Model();
					if (modelDetails.hasOwnProperty('_id')) {
						delete modelDetails._id;
					}
				}
				this.model.save(modelDetails, {
      		patch: true,
      		success: function (model) {
      			fluff.log(modelName + " saved.");
		      },
		      error: function (model, xhr) {
		        fluff.log(xhr);
					}
				});
			},
			render: function () {
				var elementObj = $(this.el);
				var modelInfo = fluff.models[modelName];
				var schema = fluff.lowerCaseObject(modelInfo.schema);
				var template = null;
				var filltag = 'input[field]';
				var fts = elementObj.find(filltag);
				if (fts.toArray().length > 0) {
					var template = elementObj.html();
				}
				
				var html = '';
				if (template) {
					html += fluff.renderFields(this.model, template) + "\n";
				}
				else {
					// TBD need to support form templates
					modelInfo.display_columns.forEach(function (field) {
						switch (schema[field.name].name) {
							case 'String':
								html += '<input type="text" name="' + field.name + '" value="' + ((this.model && this.model.get(field.name)) ? this.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Number':
								html += '<input type="number" name="' + field.name + '" value="' + ((this.model && this.model.get(field.name)) ? this.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Date':
								html += '<input type="datetime" name="' + field.name + '" value="' + ((this.model && this.model.get(field.name)) ? this.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Boolean':
								html += '<input type="checkbox" name="' + field.name + '" value="' + ((this.model && this.model.get(field.name)) ? this.model.get(field.name) : 'false') + '"' + ((this.model && this.model.get(field.name)) ? ' checked' : '') + ' /> <label>' + field.title + '</label>\n';
								break;
							case 'Array':
								html += '<input type="text" name="' + field.name + '" value="' + ((this.model && (this.model.get(field.name).length > 0)) ? this.model.get(field.name).join(',') : '') + '" placeholder="' + field.title + '" />\n';
								break;
							default:
								break;
						}
					});
					html += '<button type="button" class="submit">Submit</button>';
					elementObj.append(html + "\n");
				}
				elementObj.html(html + "\n");
				// Hitting enter key while in the form will submit.
				elementObj.bind('keypress', function(e){
   				if (e.keyCode == 13) {
     				$(this).find('.submit:first').click();
   				}
 				});
			}
		});
		fluff.addView("form", form, View);
	});
}

fluff.harvestSelects = function () {
	var elements = $("select[model]");
  elements.each(function (e) {
  	var element = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelName = element.attr('model');
  	var modelId   = null;
  	var filter    = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (element.attr('filter')) {
			filter = element.attr('filter');
		}
		var collection = fluff.addCollection({
			modelName : modelName,
			id        : modelId,
			filter    : filter
		});
		var View = Backbone.View.extend({
			el: element,
			initialize: function() {
				var that = this;
			  collection.fetch({
			  	success: function () {
			  		fluff.addModel(modelName, function () {
			  			that.render();
			  		});
			  	}
			  });
			},
			render: function() {
				var elementObj = $(this.el);
				// If there is at least one fill tag then use the first one as a template
				var rowTemplate = null;
				var filltag = 'option';
				var fts = elementObj.find(filltag);
				if (fts.toArray().length > 0) {
					var rowTemplate = fts.first().get(0).outerHTML;
					fts.first().remove();
				}
				// Build the set of children
				var html = '';
				collection.forEach(function (model) {
					if (rowTemplate) {
						html += fluff.renderFields(model, rowTemplate) + '\n';
					}
					else {
						var name = model.get('name') ? model.get('name') : model.get('_id');
						html += '<' + filltag + ' value="' + model.get('_id') + '">' + name + '</' + filltag + '>\n';
					}
				});
				elementObj.append(html);
			}
		});
		fluff.addView(type, element, View);
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
    	fluff.log("Logged in as " + fluff.session.get('user').email);
      Backbone.history.start();
    },
    error: function (xhr) {
      fluff.log("check session error:", xhr);
      Backbone.history.start();
    }
  });
}

fluff.harvestLogins = function () {
	var forms = $("form[auth]");
  forms.each(function (f) {
  	fluff.log("Processing an auth form...");
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
      			fluff.log("Logged in.");
		      },
		      error: function (model, xhr) {
		        fluff.log("login error:". xhr);
					}
				});
			},
			render: function () {
				var elementObj = $(this.el);
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
		fluff.addView("form", form, View);
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
  if (options && options.ready) {
    options.ready();
  }
}
