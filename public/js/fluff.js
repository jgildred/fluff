
// The only global
var fluff = {
	version     : "0.7",
	models      : {},
	collections : [],
	views       : []
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

fluff.drawTableBodyRow = function (model, template) {
	var html = "";
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
		html = templateObj.html();
	}
	else {
		for (field in fields) {
			html += "<td field='" + field + "'>" + fields[field] + "</td>";
		}
	}
	return html;
}

fluff.harvestTables = function () {
	var tables = $("table[model]");
  var models = {};
  tables.each(function (t) {
  	var table = $(tables[t]);
  	var modelNameInTable = table.attr('model');
  	var modelName = table.attr('model').toLowerCase();
  	if (fluff.models[modelName] == undefined ) {
  		var Model = Backbone.Model.extend({
	  		defaults: {
	  			author: "Unknown"
	  		}
			});
			fluff.models[modelName] = Model;
  		console.log("Added a model to fluff: " + modelName);
  	}
  	else {
  		var Model = fluff.models[modelName];
  	}
		var Collection = Backbone.Collection.extend({
  		model: Model,
  		url: '/fluff/api/' + modelName
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
					// if there is already a thead, then insert into it
					var thead = elementObj.find('thead');
					if (thead.toArray().length > 0) {
						thead.append(headHtml);
					}
					else {
						elementObj.prepend("<thead>\n" + headHtml + "\n</thead>");
					}
				}
				else {
					var thead = elementObj.find('thead');
					if (thead.toArray().length == 0) {
						var headHtml = "<tr>" + elementObj.find('tr th').first().parent().html() + "</tr>";
						elementObj.find('tr th').parent().remove();
						elementObj.prepend("<thead>\n" + headHtml + "\n</thead>");
					}
				}
				// If there is at least one data row then use the first one as a template
				var rowTemplate = null;
				var tds = elementObj.find('tr td');
				if (tds.toArray().length > 0) {
					var rowTemplate = "<tr>"+elementObj.find('tr td').first().parent().html()+"</tr>";
					elementObj.find('tr td').parent().remove();
				}
				// Build the body rows
				var bodyHtml = "";
				this.collection.forEach(function(model) {
					bodyHtml += "<tr>" + fluff.drawTableBodyRow(model, rowTemplate) + "</tr>\n";
				});
				// if there is already a tbody, then insert into it
				var tbody = elementObj.find('tbody');
				if (tbody.toArray().length > 0) {
					tbody.append(bodyHtml);
				}
				else {
					elementObj.append("<tbody>\n" + bodyHtml + "\n</tbody>");
				}
			}
		});
		var view = new View();
    fluff.views.push(view);
  });
}

// Build the models, collections and views
fluff.init = function (callback) {
	this.harvestTables();
  if (callback) {
    callback();
  }
}

// This creates the magic
fluff.init(function () {
	// do nothing
});
