
// The only global
var fluff = {
	version     : "0.7",
	models      : {},
	collections : [],
	views       : [],
	urlbase     : "/fluff"
};
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

// Set the id field for MongoDB
Backbone.Model.prototype.idAttribute = "_id";

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
		return templateObj.html();
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

fluff.harvestLists = function () {
	var lists = $("ul[model], ol[model]");
  lists.each(function (l) {
  	var list = $(this);
  	var type = this.nodeName.toLowerCase();
  	var modelNameInList = list.attr('model');
  	var modelName = modelNameInList.toLowerCase();
  	if (fluff.models[modelName] == undefined ) {
  		var Model = Backbone.Model.extend();
			fluff.models[modelName] = Model;
  		console.log("Added a model to fluff: " + modelName);
  	}
  	else {
  		var Model = fluff.models[modelName];
  	}
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.urlbase + '/api/' + modelName
		});
		var collection = new Collection();
		if (list.attr('filter')) {
			// tbd
		}
		fluff.collections.push(collection);
		console.log("Added a collection of " + modelName + " to fluff." );
		var View = Backbone.View.extend({
			collection: collection,
			el: type + "[model='" + modelNameInList + "']",
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
				var lis = elementObj.find('li');
				if (lis.toArray().length > 0) {
					// FIXME need to allow li attributes to remain in template
					var rowTemplate = "<li>"+elementObj.find('li').first().html()+"</li>";
					elementObj.find('li').remove();
				}
				// Build the list items
				var bodyHtml = "";
				this.collection.forEach(function(model) {
					if (rowTemplate) {
						bodyHtml += "<li>" + fluff.renderFields(model, rowTemplate) + "</li>\n";
					}
					else {
						bodyHtml += "<li>" + fluff.autoRenderFields(model, 'span', ', ') + "</li>\n";
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
  	if (fluff.models[modelName] == undefined ) {
  		var Model = Backbone.Model.extend();
			fluff.models[modelName] = Model;
  		console.log("Added a model to fluff: " + modelName);
  	}
  	else {
  		var Model = fluff.models[modelName];
  	}
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: fluff.urlbase + '/api/' + modelName
		});
		var collection = new Collection();
		if (table.attr('filter')) {
			// tbd
		}
		fluff.collections.push(collection);
		console.log("Added a collection of " + modelName + " to fluff." );
		var View = Backbone.View.extend({
			collection: collection,
			el: "table[model='" + modelNameInTable + "']",
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
				// Build the header if none
				var ths = elementObj.find('tr th');
				if (ths.toArray().length == 0) {
					var headHtml = "<tr>" + fluff.drawTableHeader(this.collection.first()) + "</tr>";
					// if there is already one or more theads, then insert into the first one
					var thead = elementObj.find('thead');
					if (thead.toArray().length > 0) {
						thead.first().append(headHtml);
					}
					else {
						elementObj.prepend("\n<thead>\n" + headHtml + "\n</thead>\n");
					}
				}
				// If there is at least one data row then use the first one as a template
				var rowTemplate = null;
				var tds = elementObj.find('tr td');
				if (tds.toArray().length > 0) {
					var rowTemplate = tds.first().parent().get(0);
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

// Build the models, collections and views
fluff.init = function (callback) {
	this.harvestTables();
	this.harvestLists();
  if (callback) {
    callback();
  }
}

// This creates the magic
fluff.init(function () {
	// do nothing
});
