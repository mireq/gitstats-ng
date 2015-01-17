(function () {

var isArray = function(value) {
	return Object.prototype.toString.call(value) === '[object Array]';
}

var dateToStr = function(d) {
	return d.getFullYear() + "/" + (d.getMonth() >= 9 ? (1+d.getMonth()) : "0" + (1+d.getMonth())) + "/" + (d.getDate() >= 10 ? d.getDate() : "0" + d.getDate());
}

var createArray = function(length) {
	var a = [];
	for (var i = 0; i < length; ++i) {
		a.push(null);
	}
	return a;
}

var Filter = function() {
	this._selector = new Selector(data);
	this._selectorQuery = [];
	this._select = null;
	this._columns = [];
	this._filterId = 0;

	this._htmlRow = document.createElement('div');
	this._htmlRow.className = 'row filter';

	this.onchange = undefined;

	var filterBody = document.getElementById("filter");
	filterBody.innerHTML = '';
	filterBody.appendChild(this._htmlRow);

	var toFlatStats = function(stats) {
		var out = createArray(stats.data.length);
		stats.data.forEach(function(item) {
			out[parseInt(item[0])] = item[1];
		});
		return out;
	}

	this.show = function(show) {
		if (show === undefined || show === true) {
			filterBody.style.display = 'block';
			this._trigger_onchange();
		}
		else {
			filterBody.style.display = 'none';
		}
	}

	this.setup = function(selectorQuery) {
		this._selectorQuery = selectorQuery;
		this._select = null;
		this._columns = [];
		this._htmlRow.innerHTML = '';

		var authors = this.select().authors();
		var authorsStats = toFlatStats(this._selector.select(this._selectorQuery[0], 'author').materialize());
		var authorsData = [];
		authors.forEach(function(author, idx) {
			authorsData.push({
				'id': idx,
				'label': author[0] + ' <' + author[1] + '>',
				'email': author[1],
				'value': authorsStats[idx]
			});
		});

		this.setupColumn({
			'label': 'Authors',
			'column': 'authors',
			'values': authorsData
		});
	}

	this.select = function() {
		if (this._select === null) {
			this._select = this._selector.select(this._selectorQuery[0], this._selectorQuery[1], this._selectorQuery[2]);
		}
		return this._select;
	}

	this.setupColumn = function(options) {
		var that = this;
		this._columns.push(options);
		var label = options.label;
		var column = options.column;
		var values = options.values;

		options.htmlColumn = document.createElement('DIV');
		this._htmlRow.appendChild(options.htmlColumn);
		var header = document.createElement('H4');
		var headerText = document.createTextNode(label);
		header.appendChild(headerText);
		options.htmlColumn.appendChild(header);

		values.sort(function(a, b) { return b.value - a.value });

		var list = document.createElement('UL');
		values.forEach(function(value) {
			that._filterId++;
			var generatedId = "filter_" + that._filterId;
			var listItem = document.createElement('LI');
			list.appendChild(listItem);

			var input = document.createElement('INPUT');
			input.setAttribute('type', 'radio');
			input.setAttribute('id', generatedId);
			input.setAttribute('value', value.id);
			input.setAttribute('name', options.column);
			listItem.appendChild(input);

			var label = document.createElement('LABEL');
			label.setAttribute('for', generatedId);
			listItem.appendChild(label);

			if (value.value !== undefined) {
				var valueSpan = document.createElement('SPAN');
				valueSpan.className = 'value';
				var valueText = document.createTextNode('(' + value.value + ')');
				valueSpan.appendChild(valueText);
				label.appendChild(valueSpan);
			}

			var labelText = document.createTextNode(value.label);
			label.appendChild(labelText);
		});
		options.htmlColumn.appendChild(list);
	}

	this._trigger_onchange = function() {
		if (this.onchange !== undefined) {
			this.onchange();
		}
	}
}

var Page = function() {
	this.pageBody = document.getElementById("content");
	this.pageHeader = document.getElementsByTagName("H1")[0];

	this.clearBody = function() {
		this.pageBody.innerHTML = '';
	}

	this.createPanel = function() {
		var panel = document.createElement('DIV');
		panel.className = 'panel';
		this.pageBody.appendChild(panel);
		return panel;
	}

	this.createPlot = function(parent) {
		var plot = document.createElement("DIV");
		plot.className = "graph";
		parent.appendChild(plot);
		return plot;
	}

	this.setPageHeader = function(text) {
		var text = document.createTextNode(text);
		this.pageHeader.innerHTML = '';
		this.pageHeader.appendChild(text);
	}
}

var Selector = function(data) {
	this.data = data;

	this._axisX = null;
	this._axisY = null;
	this._value = null;

	this._transform = function(collected) {
		var that = this;
		var data = {};
		var axis = {};
		data['labels'] = [that._axisX];
		data['data'] = [];
		collected.forEach(function(item) {
			item[1].forEach(function(v) {
				var axisKey = v[0];
				if (!(axisKey in axis)) {
					data['labels'].push(axisKey);
					axis[axisKey] = data['labels'].length - 1;
				}
			});
		});

		collected.forEach(function(item) {
			var row = createArray(data['labels'].length);
			var key = item[0];
			if (that._axisX === 'date') {
				key = new Date(key);
			}
			row[0] = key;
			item[1].forEach(function(v) {
				var axisKey = v[0];
				var value = v[1];
				row[axis[axisKey]] = value;
			});
			data['data'].push(row);
		});

		return data;
	}

	this.select = function(value, axisX, axisY) {
		var selector = new Selector(data);
		selector._value = value;
		selector._axisX = axisX;
		selector._axisY = axisY;
		selector._cache = null;
		return selector;
	}

	this.authors = function() {
		if (this._cache === null) this.materialize();
		return this._cache.authors;
	}

	this.projects = function() {
		if (this._cache === null) this.materialize();
		return this._cache.projects;
	}

	this.extensions = function() {
		if (this._cache === null) this.materialize();
		return this._cache.extensions;
	}

	this.materialize = function() {
		var that = this;

		if (that._cache !== null) {
			return that._cache.data;
		}

		that._cache = { authors: [], projects: [], extensions: [], data: [] };

		var getAxisFn = function(axis) {
			if (axis === undefined) {
				return function(data) {
					return 'all';
				}
			}
			switch (axis) {
				case 'date':
					return function(data) {
						var d = new Date(data.date * 1000);
						return dateToStr(d);
					}
					break;
				case 'author':
					return function(data) {
						return data.author;
					}
					break;
			}
		}
		var getSortFn = function(axis) {
			if (axis === undefined) {
				return function(a, b) {
					return false;
				}
			}
			switch (axis) {
				case 'date':
					return function(a, b) {
						return new Date(a[0]) - new Date(b[0]);
					}
			}
		}
		var getValueFn = function(type) {
			switch (type) {
				case 'commits':
					return function(data) {
						return 1;
					}
				case 'files':
					return function(data) {
						return data.data[0];
					}
				case 'lines':
					return function(data) {
						return data.data[1];
					}
				case 'added':
					return function(data) {
						return data.data[2];
					}
				case 'removed':
					return function(data) {
						return data.data[3];
					}
				case 'changed':
					return function(data) {
						return data.data[2] + data.data[3];
					}
			}
		}
		var getReductFn = function(type, valueFn) {
			switch (type) {
				case 'value':
					return (function () {
						var projectValues = null;
						var extensionIds = null;
						return function(data, xAxis, yAxis) {
							if (projectValues === null) {
								var extensionCount = that._cache.extensions.length;
								projectValues = createArray(that._cache.projects.length);
								for (var i = 0, len = that._cache.extensions.length; i < len; i++) {
									projectValues[i] = createArray(extensionCount);
									for (var j = 0; j < extensionCount; j++) {
										projectValues[i][j] = {};
									}
								}
								extensionIds = {};
								that._cache.extensions.forEach(function(ext, id) {
									extensionIds[ext] = id;
								});
							}

							data.forEach(function(item) {
								projectValues[item.project][extensionIds[item.extension]][yAxis] = item.value;
							});
							var sum = 0;
							projectValues.forEach(function(arr, projectId) {
								arr.forEach(function(val, extensionId) {
									if (yAxis in val) {
										sum += val[yAxis];
									}
								});
							});
							return sum;
						}
					}());
				case 'sum':
					return (function () {
						return function(data) {
							var val = 0;
							data.forEach(function(data) {
								val += data.value;
							});
							return val;
						}
					}());
				case 'commit':
					return (function () {
						var commits = {};
						return function(data) {
							var sum = 0;
							data.forEach(function(data) {
								var val = data.project + ':' + data.commit;
								if (val in commits) {
									return;
								}
								commits[val] = true;
								sum += 1;
							});
							return sum;
						}
					}());
			}
		}

		var xAxisFn = getAxisFn(that._axisX);
		var yAxisFn = getAxisFn(that._axisY);
		var valueFn = getValueFn(that._value);
		var xSortFn = getSortFn(that._axisX);
		var ySortFn = getSortFn(that._axisY);
		var reduceFn = '';
		switch (that._value) {
			case 'files':
			case 'lines':
				reduceFn = 'value';
				break;
			case 'commits':
				reduceFn = 'commit';
				break;
			default:
				reduceFn = 'sum';
		}
		reduceFn = getReductFn(reduceFn, valueFn);

		var collected = {};

		var cacheAuthors = [];

		that.data.forEach(function(project, projectId) {
			var projectName = project[0];
			var projectData = project[1];

			that._cache.projects.push([projectId, projectName]);

			var commits = projectData.commits;
			var authors = projectData.authors;
			var extensions = projectData.extensions;

			extensions.forEach(function(extension) {
				if (that._cache.extensions.indexOf(extension) === -1) {
					that._cache.extensions.push(extension);
				}
			});

			commits.forEach(function(commit, commitId) {
				var date = commit[0];
				var author = authors[commit[1]];
				var commitData = commit[2];

				if (cacheAuthors.indexOf(author[1]) === -1) {
					cacheAuthors.push(author[1]);
					that._cache.authors.push(author);
				}

				commitData.forEach(function(extensionData, extensionId) {
					var extension = extensions[extensionId];
					var data = {
						project: projectId,
						commit: commitId,
						author: cacheAuthors.indexOf(author[1]),
						extension: extension,
						date: date,
						data: extensionData
					}
					data.value = valueFn(data);
					var xAxis = xAxisFn(data);
					var yAxis = yAxisFn(data);

					xAxis in collected || (collected[xAxis] = {});
					yAxis in collected[xAxis] || (collected[xAxis][yAxis] = []);
					collected[xAxis][yAxis].push(data);
				});
			});
		});

		var sorted = [];
		for (var key in collected) {
			var value = collected[key];
			var sortedValue = [];
			for (var key2 in value) {
				sortedValue.push([key2, value[key2]]);
			}
			sortedValue.sort(ySortFn);
			sorted.push([key, sortedValue]);
		}
		sorted.sort(xSortFn);

		collected = [];

		sorted.forEach(function(a) {
			var xKey = a[0];
			var xData = a[1];
			var xCollected = [];
			collected.push([xKey, xCollected]);
			xData.forEach(function(b) {
				yKey = b[0];
				yData = b[1];
				var value = reduceFn(yData, xKey, yKey);
				xCollected.push([yKey, value]);
			});
		});

		that._cache.data = that._transform(collected);
		return that._cache.data;
	}
}

var BarChartPlotter = function(e) {
	var ctx = e.drawingContext;
	var points = e.points;
	var y_bottom = e.dygraph.toDomYCoord(0);

	var bar_width = 1;
	var xmin = points[0].xval;
	var xmax = points[points.length - 1].xval;
	var xdiff = xmax - xmin;
	for (var i = 0; i < points.length - 1; i++) {
		xdiff = Math.min(points[i+1].xval - points[i].xval, xdiff);
	}
	var bar_width = 2/3 * (points[1].canvasx - points[0].canvasx) * (xdiff / (points[1].xval - points[0].xval));

	var color = new RGBColorParser(e.color);
	color.r = Math.floor((255 + color.r) / 2);
	color.g = Math.floor((255 + color.g) / 2);
	color.b = Math.floor((255 + color.b) / 2);
	ctx.fillStyle = color.toRGB();

	for (var i = 0; i < points.length; i++) {
		var p = points[i];
		var center_x = p.canvasx;

		ctx.fillRect(center_x - bar_width / 2, p.canvasy, bar_width, y_bottom - p.canvasy);
		ctx.strokeRect(center_x - bar_width / 2, p.canvasy, bar_width, y_bottom - p.canvasy);
	}
}

var ui = {
	filter: new Filter(),
	page: new Page()
};

var getDygraphOpts = function(type, data) {
	var opts = {};
	switch (type) {
		case 'ts':
			opts = {
				stackedGraph: true,
				plotter: BarChartPlotter,
				axes: {
					x: {
						valueFormatter: Dygraph.dateString_,
						ticker: Dygraph.dateTicker
					}
				}
			}
			break;
		case 'tsline':
			opts = {
				stackedGraph: true,
				axes: {
					x: {
						valueFormatter: Dygraph.dateString_,
						ticker: Dygraph.dateTicker
					}
				}
			}
			break;
	}
	opts.labels = data.labels;
	opts.file = data.data;
	return opts;
}

var tabTransitionFunctions = (function (ui) {
	var setupPlot = function(filterArgs, plotType) {
		var panel = ui.page.createPanel();
		var plot = ui.page.createPlot(panel);
		var graph = undefined;

		ui.filter.setup(filterArgs);
		ui.filter.onchange = function() {
			var data = ui.filter.select().materialize();
			var opts = getDygraphOpts(plotType, data);
			if (graph === undefined) {
				graph = new Dygraph(plot, opts.file, opts);
			}
			else {
				graph.update(opts);
			}
		}
		ui.filter.show();
	}

	var deactivate = undefined;
	var fn = {
		commits: function() {
			return {
				activate: function() {
					setupPlot(["commits", "date"], "ts")
				},
				deactivate: function() {
					ui.filter.onchange = undefined;
					ui.filter.show(false);
				}
			}
		},
		files: function() {
			return {
				activate: function() {
					setupPlot(["files", "date"], "tsline")
				},
				deactivate: function() {
					ui.filter.onchange = undefined;
					ui.filter.show(false);
				}
			}
		},
		lines: function() {
			return {
				activate: function() {
					setupPlot(["lines", "date"], "tsline")
				},
				deactivate: function() {
					ui.filter.onchange = undefined;
					ui.filter.show(false);
				}
			}
		},
		changes: function() {
			return {
				activate: function() {
					setupPlot(["changed", "date"], "ts")
				},
				deactivate: function() {
					ui.filter.onchange = undefined;
					ui.filter.show(false);
				}
			}
		}
	}

	var activateFunctions = {};
	for (fun in fn) {
		var functions = fn[fun]();
		activateFunctions[fun] = (function (functions) {
			return function() {
				if (deactivate !== undefined) {
					deactivate();
				}
				deactivate = functions.deactivate;
				return functions.activate();
			}
		}(functions));
	}
	return activateFunctions;
}(ui));

var stateTransitions = {
	tab: function(value) {
		var titleLabels = {
			'commits': 'Commits',
			'files': 'Files',
			'lines': 'Lines',
			'changes': 'Changes'
		}
		ui.page.setPageHeader(titleLabels[value]);
		var sidebar = document.getElementById('sidebar');
		var sidebarLinks = sidebar.getElementsByTagName('A');
		for (var i = 0, len = sidebarLinks.length; i < len; i++) {
			var href = sidebarLinks[i].getAttribute('href');
			if (href == '#tab_' + value) {
				setActiveClass(sidebarLinks[i]);
			}
		}
		ui.page.clearBody();

		tabTransitionFunctions[value]();
	}
};

var loadState = function(link) {
	var link = link.substr(1);
	var parts = link.split("__");
	for (var i = 0, len = parts.length; i < len; i++) {
		var part = parts[i].split('_');
		var name = part[0];
		var values = part.slice(1);
		var transition = stateTransitions[name];
		if (transition === undefined) {
			return;
		}
		for (var j = 0, lenvalues = values.length; j < lenvalues; j++) {
			transition(values[j]);
		}
	}
}

// register links
var linkClicked = function() {
	var link = this.getAttribute("href");
	loadState(link);
}

var setActiveClass = function(node) {
	var parentNode = node.parentNode;
	for (var i = 0; i < parentNode.childNodes.length; ++i) {
		var el = parentNode.childNodes[i];
		if (el.className != undefined) {
			if (el == node) {
				el.className = "item active";
			}
			else {
				el.className = "item";
			}
		}
	}
}

var registerLinks = function(container) {
	var links = container.getElementsByTagName('A');
	for (var i = 0, len = links.length; i < len; i++) {
		var link = links[i];
		var href = link.getAttribute('href');
		if (href && href[0] === '#') {
			link.onclick = linkClicked;
		}
	}
}
registerLinks(document);

loadState('#tab_commits');

}());
