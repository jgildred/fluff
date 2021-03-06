
//
// This is the fluff.js client library for Fluff
//

// The only global
if (!Fluff) {
	var Fluff = {};
}
Fluff.version     = "0.9";
Fluff.session     = {};
Fluff.models      = {};
Fluff.collections = {};
Fluff.views       = {};
Fluff.ui          = {};
Fluff.path        = "/fluff";     // This must match the fluff site configuration.
Fluff.apikey      = "1234567890"; // Leave as null or empty string if not required.

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

// Helper function
Fluff.objectType = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

// Basic logger
Fluff.log = function (msg, obj) {
	if (msg) {
		console.log(msg);
	}
	if (obj) {
		console.log(obj);
	}
}

Fluff.flattenArray = function (objectArray, key) {
  var array = [];
  objectArray.forEach(function (object) {
    array.push(object[key]);
  });
  return array;
}

Fluff.dehumanize = function (string) {
  if (string) {
    return string.replace(" ", "_").toLowerCase();
  }
}

// Useful when comparing schema attributes
Fluff.lowerCaseObject = function (obj) {
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

// Adds the text to the object as an array or as a string
var addArrayOrString = function(object, name, text) {
  if (name.match(/\[\]/)) {
    name = name.replace('[]','');
    object[name] = text.replace(' ','').split(',');
  }
  else {
    object[name] = text;
  }
  return object;
}

// Binds or unbinds a keyboard key to a function
var listenKeydown = function(on, key, callback) {
  if (on && callback) {
    $(window).bind('keydown',function(e){
      if (!( String.fromCharCode(e.which).toLowerCase() == key && e.metaKey)) return true;
      e.preventDefault();
      callback();
      return false;
    });
  }
  else {
    $(window).unbind('keydown');
  }
}

// Useful for common JSON error responses
Fluff.responseErrorMsg = function (xhr, messages) {
	if (xhr && messages) {
		var msg;
		if (xhr.responseJSON && xhr.responseJSON.msg) {
			msg = xhr.responseJSON.msg;
		}
		Object.keys(messages).forEach(function() {
			if (messages.this) {
				msg = msg || messages.this;
			}
		});
		return msg;
	}
	else {
		return null;
	}
};

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

Fluff.dataToSchema = function (data) {
	if (data) {
		var ObjectId = String,
	      Buffer   = String,
	      Mixed    = String;
	  eval("var schema = " + data + ";");
	  schema = Fluff.lowerCaseObject(schema);
	  schema._id            = ObjectId;
	  schema.creator_id     = ObjectId;
	  schema.lastupdater_id = ObjectId;
	  schema.creation       = Date;
	  schema.lastupdate     = Date;
	  return schema;
	}
}

Fluff.addCollection = function (options) {
	var modelName = options.modelName;
	var name = modelName,
			path = modelName;
	if (options.id) {
		name += "/" + options.id;
		path = name;
	}
	else {
		if (options.query) {
			name += ":" + options.query;
			path += "?" + options.query;
		}
	}
	if (Fluff.collections[name] == undefined) {
		var Model = Backbone.Model.extend({
			urlRoot: Fluff.path + '/admin/api/' + modelName
		});
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: Fluff.path + '/admin/api/' + path
		});
		var collection = new Collection();
		Fluff.collections[name] = collection;
		Fluff.log("ADDED COLLECTION: " + name);
	}
	else {
		var collection = Fluff.collections[name];
	}
	return collection;
}

Fluff.addModel = function (name, callback) {
	if (Fluff.models[name] == undefined) {
		$.ajax({
			type: 'GET',
			url: Fluff.path + '/admin/api/' + name + '/info',
			dataType: 'json',
			success : function (data, status, xhr) {
				if (data && data.schema_data) {
					var Schema = Fluff.dataToSchema(data.schema_data);
					Fluff.models[name] = {
						schema          : Schema,
						display_columns : data.display_columns,
						column_sort     : data.column_sort
					};
			  	Fluff.log("ADDED MODEL: " + name);
				}
				else {
					Fluff.log("Failed to add model: " + name);
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

Fluff.addView = function (type, element, View, callback) {
	var name = type + "[model=" + element.attr('model') + "]";
	if (element.attr('auth')) {
		name = type + "[auth]";
	}
	if (element.attr('id')) {
		name = type + "#" + element.attr('id');
	}
	if (Fluff.views[name] == undefined) {
	  Fluff.views[name] = new View();
	  Fluff.log("ADDED VIEW: " + name);
	}
	if (callback) {
		callback();
	}
}

Fluff.drawTableHeader = function (modelInfo) {
	var html = "";
	modelInfo.display_columns.forEach(function (column) {
		html += "<th>" + column.title + "</th>";
	});
	return html;
}

Fluff.renderFields = function (model, template, formatters) {
	var fields = model.toJSON();
	if (template) {
		var templateObj = $('<div></div>');
		$(template).appendTo(templateObj);
		// First render fields base upon the field attribute
		var elements = templateObj.find('[field],[name]');
		elements.each(function () {
			var element = $(this);
			var type = this.nodeName.toLowerCase();
			var field = fields[Fluff.dehumanize(element.attr('field'))];
			if (formatters && formatters[Fluff.dehumanize(element.attr('field'))]) {
				field = formatters[Fluff.dehumanize(element.attr('field'))](field);
			}
			if (field == undefined) {
			  field = fields[Fluff.dehumanize(element.attr('name'))];
			  if (formatters && formatters[Fluff.dehumanize(element.attr('field'))]) {
					field = formatters[Fluff.dehumanize(element.attr('field'))](field);
				}
			}
			else {
				switch (type) {
					case 'input':
						switch (element.attr('type')) {
							case 'checkbox':
								element.attr('value', field);
								if (field) {
									this.checked = true;
								}
								else {
									this.checked = false;
								}
								break;
							default:
								element.attr('value', field);
						}
						break;
					case 'a':
					  element.attr('href', field);
					  break;
					case 'img':
					  element.attr('src', field);
					  break;
					default:
						element.html(field);
				}
			}
		});
		// Next render fields based upon the {{field_name}} tag
		var html = templateObj.html();
		for (field in fields) {
		  var pattern = new RegExp("{{\\s*" + field + "\\s*}}", "gi");
      html = html.replace(pattern, fields[field]);
		}
		return html;
	}
	else {
		return "";
	}
}

Fluff.autoRenderFields = function (model, modelInfo, elementType, dividerHtml, formatters) {
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

Fluff.harvestElements = function (element) {
  var tags  = ["div", "span", "ul", "ol"];
  if (element && (tags.IndexOf(element.nodeName.toLowerCase()) != -1)) {
    var elements = $(element);
  }
  else {
	  var elements = $(tags.join("[model], ") + "[model]").not(tags.join("[noharvest], ") + "[noharvest]");
	}
  elements.each(function (e) {
  	var element = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelName = element.attr('model');
  	var modelId   = null;
  	var query     = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (element.attr('query')) {
			query = element.attr('query');
		}
		var collection = Fluff.addCollection({
			modelName : modelName,
			id        : modelId,
			query     : query
		});
		var View = Backbone.View.extend({
			el: element,
			initialize: function() {
				var that = this;
			  collection.fetch({
			  	success: function () {
			  		Fluff.addModel(modelName, function () {
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
						bodyHtml += Fluff.renderFields(model, rowTemplate) + "\n";
					}
					else {
						var tag = filltag.split('[')[0];
						bodyHtml += "<" + tag + ">" + Fluff.autoRenderFields(model, Fluff.models[modelName], 'span', ', ') + "</" + tag + ">\n";
					}
				});
				elementObj.append(bodyHtml);
			}
		});
		Fluff.addView(type, element, View);
	});
}

Fluff.harvestTables = function (table) {
  if (table) {
    var tables = $(table);
  }
  else {
	  var tables = $("table[model]").not("table[noharvest]");
	}
  tables.each(function (t) {
  	var table = $(this);
  	var modelName = table.attr('model');
  	var modelId   = null;
  	var query     = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (table.attr('query')) {
			query = table.attr('query');
		}
		var View = Backbone.View.extend({
			el: table,
			initialize: function() {
				var that = this;
			  this.setRowTemplate();
				this.collection = Fluff.addCollection({
					modelName : modelName,
					id        : modelId,
					query     : query
				});
				if (table.attr('norender') == undefined) {
					this.collection.fetch({
				  	success: function () {
				  		Fluff.addModel(modelName, function () {
				  			that.render();
				  		});
				  	}
				  });
				}
			},
			clear: function() {
				var elementObj = $(this.el);
				// Build the header if none
				var tbody = elementObj.find('tbody');
				if (tbody.toArray().length > 0) {
					tbody.html('\n');
				}
				else {
					elementObj.append("<tbody>\n</tbody>");
				}
			},
			changeQuery: function(newquery, callback) {
				var that = this;
				this.collection = Fluff.addCollection({
					modelName : modelName,
					id        : modelId,
					query     : newquery
				});
				this.collection.fetch({
			  	success: function () {
			  		if (callback) { callback() }
			  	}
			  });
			},
			change: function(id) {
			  var elementObj = $(this.el).find('tr[id=' + id + ']');
			  var model = this.collection.get(id);
			  var bodyHtml = Fluff.renderFields(model, this.rowTemplate) + "\n";
			  elementObj.replaceWith($(bodyHtml));
			},
			remove: function(id) {
			  var elementObj = $(this.el).find('tr[id=' + id + ']');
			  elementObj.remove();
			},
			// formatter can contain a function for each field which requires formatting
			formatter: {},
			// If no template specified, then the first data row will be used and tbody cleared
			setRowTemplate: function(template) {
				if (template) {
					this.rowTemplate = template;
				}
				else {
					var elementObj = $(this.el);
					var tds = elementObj.find('tr td');
					if (tds.toArray().length > 0) {
					  tds.first().parent().attr('id', '{{id}}');
						this.rowTemplate = tds.first().parent().get(0).outerHTML;
						tds.parent().remove();
					}
					if (elementObj.find('tbody').toArray().length == 0) {
						elementObj.append("<tbody>\n</tbody>");
					}
				}
			},
			refresh: function(callback) {
				var that = this;
				this.collection.fetch({
			  	success: function () {
			  		that.render();
			  		if (callback) {
			  			callback();
			  		}
			  	}
			  });
			},
			render: function() {
			  var that = this;
				var elementObj = $(this.el);
				// Build the header if none
				var ths = elementObj.find('tr th');
				if (ths.toArray().length == 0) {
					Fluff.log("build header for: ", this.el);
					var headHtml = "<tr>" + Fluff.drawTableHeader(Fluff.models[modelName]) + "</tr>";
				}
				else {
					var headHtml = ths.first().parent().get(0).outerHTML;
					ths.parent().remove();
				}
				// If there is already one or more theads, then insert into the first one
				var thead = elementObj.find('thead');
				if (thead.toArray().length > 0) {
					thead.first().append(headHtml);
				}
				else {
					elementObj.append("\n<thead>\n" + headHtml + "\n</thead>\n");
				}
				// Make sure there is a data row template
				if (!this.rowTemplate) {
					this.setRowTemplate();
				}
				this.clear();
				// Build the body rows
				var bodyHtml = "\n";
				this.collection.forEach(function(model) {
					if (that.rowTemplate) {
						bodyHtml += Fluff.renderFields(model, that.rowTemplate, that.formatter) + "\n";
					}
					else {
						bodyHtml += "<tr id='" + model.id + "'>" + Fluff.autoRenderFields(model, Fluff.models[modelName], 'td', null, that.formatter) + "</tr>\n";
					}
				});
				elementObj.find('tbody').first().append(bodyHtml + "\n");
			}
		});
		Fluff.addView("table", table, View);
  });
}

Fluff.harvestForms = function (options) {
  if (options && options.form) {
    var forms = $(options.form);
  }
  else {
	  var forms = $("form[model]").not("form[noharvest]");
	}
  forms.each(function (f) {
  	var form = $(this);
  	var modelName = form.attr('model');
  	var modelId   = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
  	var Model = Backbone.Model.extend({
			urlRoot: Fluff.path + '/admin/api/' + modelName
		});
		var View = Backbone.View.extend({
			el: form,
  		events: {
  			'change [type=checkbox]' : 'changeCheckbox',
    		'click  .submit'         : 'submit'
  		},
			initialize: function() {
				if (options) {
					this.callback = this.callback || options.callback;
					this.template = this.template || options.template;
				}
				this.modelId = this.modelId || modelId;
				this.modelName = this.modelName || modelName;
				var that = this;
				if (modelId) {
					Fluff.log("Form with model=" + modelName + " and ID " + modelId);
				}
				if (this.modelId) {
					this.model = new Model({
						_id: this.modelId
					});
					this.model.fetch({
				  	success: function () {
				  		Fluff.addModel(modelName, function () {
			  				that.render(that.callback);
			  			});
				  	}
				  });
				}
				else {
				  this.model = null;
					Fluff.addModel(modelName, function () {
			  		that.render(that.callback);
			  	});
				}
			},
			success: null,
			error:null,
			changeCheckbox: function (ev) {
				var checkbox = $(ev.currentTarget);
				if (checkbox.prop('checked')) {
					checkbox.val('true');
				}
				else {
					checkbox.val('false');
				}
			},
			setAction: function (action) {
			  if (action) {
			    this.action = action;
			  }
			},
			setId: function (id, callback) {
			  this.modelId = id;
			  this.callback = callback;
			  this.initialize();
			},
			submit: function (ev) {
				var that = this;
				var modelDetails = getFormData(form);
				if (!this.model) {
					this.model = new Model();
					if (modelDetails.hasOwnProperty('_id')) {
						delete modelDetails._id;
					}
				}
				else {
				  // Make sure the data your saving includes ID
				  if (!modelDetails.hasOwnProperty('_id')) {
						modelDetails._id = this.model.get('_id');
					}
				}
				this.model.save(modelDetails, {
      		patch: true,
      		wait: true,
      		success: function (model) {
      			Fluff.log(modelName + " saved.");
      			if (that.success) {
      				that.success(model);
      			}
      			if (that.action) {
      			  that.action(that.model);
      			}
		      },
		      error: function (model, xhr) {
		        Fluff.log("XHR error while trying to save:", xhr);
		        if (that.error) {
      				that.error(model,xhr);
      			}
					}
				});
			},
			render: function (callback) {
			  var that = this;
				var elementObj = that.$el;
				
				var modelInfo = Fluff.models[that.modelName];
				var schema = Fluff.lowerCaseObject(modelInfo.schema);
				var filltag = 'input[name]';
				var fts = elementObj.find(filltag);
				if (fts.toArray().length > 0) {
					this.template = this.template || elementObj.html();
				}
				var html = '';
				if (this.template) {
				  if (this.model) {
					  html += Fluff.renderFields(this.model, this.template) + "\n";
					}
					else {
					  html += this.template;
					}
				}
				else {
					modelInfo.display_columns.forEach(function (field) {
					  if (schema[field.name].name) {
					    var type = schema[field.name].name;
					  }
					  else {
					    var type = schema[field.name].type.name;
					  }
						switch (type) {
							case 'String':
								html += '<input type="text" name="' + field.name + '" value="' + ((that.model && that.model.get(field.name)) ? that.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'String':
								html += '<input type="email" name="' + field.name + '" value="' + ((that.model && that.model.get(field.name)) ? that.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Number':
								html += '<input type="number" name="' + field.name + '" value="' + ((that.model && that.model.get(field.name)) ? that.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Date':
								html += '<input type="datetime" name="' + field.name + '" value="' + ((that.model && that.model.get(field.name)) ? that.model.get(field.name) : '') + '" placeholder="' + field.title + '" />\n';
								break;
							case 'Boolean':
								html += '<input type="checkbox" name="' + field.name + '" value="' + ((that.model && that.model.get(field.name)) ? that.model.get(field.name) : 'false') + '"' + ((that.model && that.model.get(field.name)) ? ' checked' : '') + ' /> <label>' + field.title + '</label>\n';
								break;
							case 'Array':
								html += '<input type="text" name="' + field.name + '" value="' + ((that.model && (that.model.get(field.name).length > 0)) ? that.model.get(field.name).join(',') : '') + '" placeholder="' + field.title + '" />\n';
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
     				e.preventDefault();
     				that.submit();
   				}
 				});
 				if (callback) {
 				  callback();
 				}
			}
		});
		Fluff.addView("form", form, View, function () {
			if (options && options.callback) {
				options.callback();
			}
		});
	});
}

Fluff.harvestSelects = function (options) {
  if (options && options.select) {
    var selects = $(options.select);
  }
  else {
    var selects = $("select[model]").not("select[noharvest]");
  }
  selects.each(function (e) {
  	var select = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelName = select.attr('model');
  	var modelId   = null;
  	var query     = null;
  	if (modelName.split("/").length > 1) {
  		modelId   = modelName.split("/")[1];
  		modelName = modelName.split("/")[0].toLowerCase();
  	}
		if (select.attr('query')) {
			query = select.attr('query');
		}
		var collection = Fluff.addCollection({
			modelName : modelName,
			id        : modelId,
			query     : query
		});
		var View = Backbone.View.extend({
			el: select,
			initialize: function() {
				var that = this;
			  collection.fetch({
			  	success: function () {
			  		Fluff.addModel(modelName, function () {
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
						html += Fluff.renderFields(model, rowTemplate) + '\n';
					}
					else {
						var name = model.get('name') ? model.get('name') : model.get('_id');
						html += '<' + filltag + ' value="' + model.get('_id') + '">' + name + '</' + filltag + '>\n';
					}
				});
				elementObj.append(html);
			}
		});
		Fluff.addView(type, select, View);
	});
}

Fluff.harvestLogins = function (options) {
	if (options && options.form) {
    var forms = $(options.form);
  }
  else {
    var forms = $("form[auth]").not("form[noharvest]");
  }
  forms.each(function (f) {
  	var form = $(this);
		var View = Backbone.View.extend({
			el: form,
			template: null,
  		events: {
    		'click .submit' : 'submit'
  		},
			initialize: function() {
				this.render();
			},
			success: null,
			error:null,
			submit: function (ev) {
				var loginDetails = getFormData(form);
				if ($.isEmptyObject(Fluff.session)) {
					Fluff.session = new Fluff.Session();
				}
				var that = this;
				Fluff.session.login(loginDetails, {
      		success: function (model) {
      			Fluff.log("Logged in.");
      			if (that.success) {
      				that.success(model);
      			}
		      },
		      error: function (model, xhr) {
		        Fluff.log("login error:", xhr);
		        if (that.error) {
      				that.error(model, xhr);
      			}
					}
				});
			},
			render: function (callback) {
				var that = this;
				var elementObj = this.$el;
				var inputEmail = elementObj.find('input[name=email]');
				if (inputEmail.toArray().length == 0) {
					elementObj.append('<input type="text" name="email" value="" placeholder="Email" />\n');
				}
				var inputPassword = elementObj.find('input[name=password]');
				if (inputPassword.toArray().length == 0) {
					inputEmail.first().append('<input type="password" name="password" value="" placeholder="Password" />\n');
				}
				// Hitting enter key while in the form will submit.
				elementObj.bind('keypress', function(e){
   				if (e.keyCode == 13) {
   					e.preventDefault();
     				that.submit();
   				}
 				});
 				if (callback) {
 					callback();
 				}
			}
		});		
		Fluff.addView("form", form, View, function () {
			if (options && options.callback) {
				options.callback();
			}
		});
	});
}

Fluff.Session = Backbone.Model.extend({
  urlRoot: Fluff.path + '/admin/api/auth',
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
    var that = this;
    this.save(credentials, {
      success: function (data) {
      	that.unset('password', {silent: true});
      	that.unset('email', {silent: true});
      	if (options && options.success) {
      		options.success(data);
      	}
      },
      error: function (data, xhr) {
      	if (options && options.error) {
      		options.error(data, xhr);
      	}
      }
    });
  },
  logout: function(options) {
    // Do a DELETE to /auth and clear the clientside data
    var that = this;
    this.destroy({
      success: function (model, resp) {
        model.clear();
        model.id = null;
        if (options && options.success) {
        	options.success();
        }
      },
      error: function () {
      	if (options && options.error) {
      		options.error();
      	}
      }
    });
  }
});

// Check if the session is still active
Fluff.checkSession = function (options) {
	Fluff.session = new Fluff.Session();
	Fluff.session.fetch({
    success: function (data, status, xhr) {
    	if (Fluff.session.get('user')) {
    		var msg = "Logged in as " + Fluff.session.get('user').email;
    	}
    	else {
    		if (Fluff.session.get('human')) {
    			var msg = "Not logged in, but human.";
    		}
	      else {
	      	var msg = "Not logged in.";
	      }
    	}
    	Fluff.log(msg);
    	Backbone.history.start();
      if (options && options.success) {
      	options.success(data, status, xhr);
      }
    },
    error: function (data, xhr) {
    	Fluff.log("Error checking session:", xhr);
    	Backbone.history.start();
      if (options && options.error) {
      	options.error(data, xhr);
      }
    }
  });
};

// See if the user is human
Fluff.checkCaptcha = function(options) {
  $.ajax({
    type: 'POST',
    url: Fluff.path + '/admin/api/captcha',
    dataType: 'json',
    data: {
      recaptcha_challenge_field: Recaptcha.get_challenge(), 
      recaptcha_response_field:  Recaptcha.get_response()
    },
    success : function (data, status, xhr) {
      if (data) {
      	Fluff.session.auth  = data.auth;
        Fluff.session.human = data.human;
        Fluff.session._csrf = data._csrf;
      }
      if (options && options.success) {
      	options.success(data, status, xhr);
      }
    },
    error : function (data, xhr) {
      Fluff.log("Error checking captcha: " + xhr.status);
      if (options && options.error) {
      	options.error(data, xhr);
      }
    }
  });
  return false;
};

// Verify that the user has an email address using a token
Fluff.verifyEmail = function (options) {
	if (options && options.token) {
	  $.ajax({
	    type: 'PUT',
	    url: Fluff.path + '/admin/api/verify/' + options.token,
	    dataType: 'json',
	    success: function (data, status, xhr) {
	      if (options.success) {
	      	options.success(data, status, xhr);
	      }
	    },
	    error: function (xhr) {
	      Fluff.log("Error verifying email: " + xhr.status);
	      if (options.error) {
	      	options.error(xhr);
	      }
	    }
	  });
	}
  return false;
};

// Request to reset password for a given user email
Fluff.passwordReset = function (options) {
	if (options && options.email) {
	  $.ajax({
	    type: 'PUT',
	    url: Fluff.path + '/admin/api/pwreset/' + options.email,
	    dataType: 'json',
	    success : function (data, status, xhr) {
	      if (options.success) {
	      	options.success(data, status, xhr);
	      }
	    },
	    error : function (xhr) {
	      Fluff.log("Error requesting password reset: " + xhr.status);
	      if (options.error) {
	      	options.error(xhr);
	      }
	    }
	  });
	}
  return false;
};

// Change the user password using a token
Fluff.passwordChange = function (options) {
	if (options && options.token && options.password) {
	  $.ajax({
	    type: 'PUT',
	    url: Fluff.path + '/admin/api/pwchange/' + options.token,
	    data: {password: options.password},
	    dataType: 'json',
	    success : function (data, status, xhr) {
	      if (data) {
	      	// TBD fix for session backbone model 
	      	Fluff.session.auth  = data.auth;
	        Fluff.session.human = data.human;
	        Fluff.session._csrf = data._csrf;
	      }
	      if (options.success) {
	      	options.success(data, status, xhr);
	      }
	    },
	    error : function (xhr) {
	      Fluff.log("Error trying to change password: " + xhr.status);
	      if (options.error) {
	      	options.error(xhr);
	      }
	    }
	  });
	}
  return false;
};

// Build the models and collections and render the views
Fluff.init = function (options) {
	if (Fluff.apikey && (Fluff.apikey != '')) {
		// prefilter for all ajax calls
	  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
	    // Modify options, control originalOptions, store jqXHR, etc
	    options.headers = options.headers || {};
	    options.headers['X-API-Key'] = encodeURIComponent(Fluff.apikey);
	  });
	}
	// Define this function in the main page to run before Fluff is loaded
	if (Fluff.preload) {
		Fluff.preload();
	}
	// Initialize Fluff UI if exists
	if (Fluff.ui.init) {
		Fluff.ui.init(options);
	}
	if (!(options && (options.harvest == false))) {
		this.harvestElements();
		this.harvestTables();
		this.harvestSelects();
		// No need to harvest again if Fluff UI did it already
		if (!Fluff.ui.init) {
			this.harvestLogins();
			this.harvestForms();
		}
	}
	// Run the ready state callback
  if (options && options.ready) {
    options.ready();
  }
  // Define this function in the main page to run after Fluff is loaded
  if (Fluff.onload) {
  	Fluff.onload();
  }
};
