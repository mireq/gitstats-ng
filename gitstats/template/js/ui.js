var pageBody = document.getElementById("content");
var pageHeader = pageBody.getElementsByTagName("H1")[0];
var pageContent = pageBody.getElementsByTagName("SECTION")[0];

var selectedProjects = [null];
var selectedAuthors = [null];
var selectedExtensions = [null];
var selectedTypes = [null];

var array_setdefault = function(array, key, value) {
	if (array[key] == undefined) {
		array[key] = value;
	}
}

var array_get = function(array, key, value) {
	if (array[key] == undefined) {
		return value;
	}
	else {
		return array[key];
	}
}

pageHeader.onclick = function() {
	var filter = document.getElementById("project_filter");
	if (filter != undefined) {
		if (filter.style.display == "none") {
			filter.style.display = "block";
		}
		else {
			filter.style.display = "none";
		}
	}
};

var Selector = function(data) {
	this.data = data;
	this.filters = [];

	this._group_x = "date";
	this._group_y = null;
	this._column = null;
	this._function = null;
	this._filter_project = null;
	this._filter_author = null;
	this._filter_extension = null;
	this._filter_type = null;
	this._cache = null;

	var group_x = function(gx) {
		this._group_x = gx;
		this._cache = null;
		return this;
	}

	var group_y = function(gy) {
		this._group_y = gy;
		this._cache = null;
		return this;
	}

	var filter_project = function(project) {
		this._cache = null;
		if (project !== null && Object.prototype.toString.call(project) !== '[object Array]') {
			project = [project];
		}
		this._filter_project = project;
		return this;
	}

	var filter_author = function(author) {
		this._cache = null;
		if (author !== null && Object.prototype.toString.call(author) !== '[object Array]') {
			author = [author];
		}
		this._filter_author = author;
		return this;
	}

	var filter_extension = function(extension) {
		this._cache = null;
		if (extension !== null && Object.prototype.toString.call(extension) !== '[object Array]') {
			extension = [extension];
		}
		this._filter_extension = extension;
		return this;
	}

	var filter_type = function(type) {
		this._filter_type = type;
		return this;
	}

	var projects = function() {
		if (this._cache === null) {
			this.materialize();
		}
		return this._cache.projects;
	}

	var authors = function() {
		if (this._cache === null) {
			this.materialize();
		}
		return this._cache.authors;
	}

	var extensions = function() {
		if (this._cache === null) {
			this.materialize();
		}
		var ext_array = [];
		for (var i = 0; i < this._cache.extensions.length; ++i) {
			var ext = this._cache.extensions[i];
			var label = ext;
			if (label === "") {
				label = "NONE";
			}
			else {
				label = label.substr(1);
			}
			ext_array.push([label, ext]);
		}
		return ext_array;
	}

	var date_to_str = function(d) {
		return d.getFullYear() + "/" + (d.getMonth() >= 9 ? (1+d.getMonth()) : "0" + (1+d.getMonth())) + "/" + (d.getDate() >= 10 ? d.getDate() : "0" + d.getDate());
	}

	this.select = function(column, fun) {
		var selector = new Selector(data);
		selector.group_x = group_x;
		selector.group_y = group_y;
		selector.filter_project = filter_project;
		selector.filter_author = filter_author;
		selector.filter_extension = filter_extension;
		selector.filter_type = filter_type;
		selector.projects = projects;
		selector.authors = authors;
		selector.extensions = extensions;
		selector._column = column;
		selector._function = fun;
		return selector;
	}

	this.materialize = function() {
		if (this._cache !== null) {
			return this._cache.stats;
		}
		this._cache = { authors: [], projects: [], extensions: [] };

		var xMin = null;
		var xMax = null;
		var stats = {};
		var yAxisKeys = {};

		for (var a = 0, lena = this.data.length; a < lena; ++a) {
			if (this._filter_project !== null) {
				if (this._filter_project.indexOf(a) === -1) {
					continue;
				}
			}

			var projectName = this.data[a][0];
			var projectData = this.data[a][1];

			this._cache.projects.push([projectName, a]);

			var commits = projectData.commits;
			var authors = projectData.authors;
			var extensions = projectData.extensions;

			var get_x_axis_fn = function(self) {
				switch (self._group_x) {
					case "date":
						return function(commit) {
							var d = new Date(commit[0] * 1000);
							return date_to_str(d);
						}
					case null:
						return function() {
							return "all";
						}
					default:
						return function() {
							return undefined;
						}
				}
			}

			var get_y_axis_fn = function(self) {
				switch (self._group_y) {
					case "author":
						return function(commit) {
							return authors[commit[1]][1];
						}
					case null:
						return function() {
							return "all";
						}
					default:
						return function() {
							return undefined;
						}
				}
			}

			var get_value_fn = function(self) {
				switch (self._column) {
					case "commit":
						return function(extensionData, extension_id) {
							if (extension_id === 0) {
								return undefined;
							}
							else {
								return null;
							}
						}
					case "files":
						return function(extensionData) {
							return extensionData[0];
						}
					case "lines":
						return function(extensionData) {
							return extensionData[1];
						}
					case "changes":
						return function(extensionData) {
							return [extensionData[2], extensionData[3]];
						}
					default:
						return function() {
							return undefined;
						}
				}
			}

			var get_save_fn = function(self) {
				switch (self._function) {
					case "count":
						return function(value, stat, yAxis) {
							array_setdefault(stat, yAxis, 0);
							if (value !== null) {
								stat[yAxis]++;
							}
						}
					case "sum":
						return function(value, stat, yAxis) {
							if (stat[yAxis] === undefined) {
								stat[yAxis] = value;
							}
							else {
								if (Object.prototype.toString.call(value) === '[object Array]') {
									for (var i = 0; i < value.length; ++i) {
										stat[yAxis][i] += value[i];
									}
								}
								else {
									if (value !== null) {
										stat[yAxis] += value;
									}
								}
							}
						}
					case "value":
						if (self._group_y === "extension") {
							return function(value, stat, yAxis) {
								stat[yAxis] = value;
							}
						}
						else {
							return function(value, stat, yAxis) {
								array_setdefault(stat, yAxis, 0);
								stat[yAxis] += value;
							}
						}
					default:
						return function() {};
				}
			}

			var xAxisFn = get_x_axis_fn(this);
			var yAxisFn = get_y_axis_fn(this);
			var valueFn = get_value_fn(this);
			var saveFn = get_save_fn(this);

			for (var i = 0; i < extensions.length; ++i) {
				if (this._cache.extensions.indexOf(extensions[i]) === -1) {
					this._cache.extensions.push(extensions[i]);
				}
			}
			for (var b = 0, lenb = commits.length; b < lenb; ++b) {
				var commit = commits[b];
				var author = authors[commit[1]];
				var commitData = commit[2];
				var xAxis = "";

				if (this._filter_author !== null) {
					if (this._filter_author.indexOf(author[1]) === -1) {
						continue;
					}
				}

				if (this._cache.authors.indexOf(author) === -1) {
					this._cache.authors.push(author);
				}

				xAxis = xAxisFn(commit);
				yAxis = yAxisFn(commit);
				if (yAxis !== undefined) {
					yAxisKeys[yAxis] = true;
				}

				xMin = (xMin === null || xAxis < xMin) ? xAxis : xMin;
				xMax = (xMax === null || xAxis > xMax) ? xAxis : xMax;

				array_setdefault(stats, xAxis, {});
				var stat = stats[xAxis];

				if (this._function === "value" && yAxis !== undefined) {
					stat[yAxis] = 0;
				}

				for (var c = 0, lenc = commitData.length; c < lenc; ++c) {
					var extension = extensions[c];
					var extensionData = commitData[c];

					if (this._filter_extension !== null) {
						if (this._filter_extension.indexOf(extension) === -1) {
							continue;
						}
					}

					if (this._group_y === "extension") {
						yAxis = extension;
						yAxisKeys[yAxis] = true;
					}

					saveFn(valueFn(extensionData, c), stat, yAxis);
				}
			}
		}

		var yAxisKeysArray = [];
		for (var key in yAxisKeys) {
			yAxisKeysArray.push(key);
		}

		var group = this._group;
		var axis_data_filter = function(val) { return val; };
		if (this._column === "changes") {
			if (yAxisKeysArray.length === 1 && this._filter_type === null) {
				group = "change_type";
			}
			else {
				if (this._filter_type.indexOf("Added") !== -1) {
					axis_data_filter = function(val) { return val[0]; };
				}
				else if (this._filter_type.indexOf("Removed") !== -1) {
					axis_data_filter = function(val) { return val[1]; };
				}
				else {
					axis_data_filter = function(val) { return val[0] + val[1]; };
				}
			}
		}

		if (this._group_x == "date") {
			xMin = new Date(xMin);
			xMax = new Date(xMax);
			var last = {};
			for (var d = xMin; d <= xMax; d.setDate(d.getDate() + 1)) {
				var dateStr = date_to_str(d);
				if (stats[dateStr] === undefined) {
					if (this._column === "files" || this._column === "lines") {
						stats[dateStr] = last;
					}
					else {
						stats[dateStr] = {};
					}
				}
				else {
					last = stats[dateStr];
				}
			}
		}

		for (var key in stats) {
			var stat = stats[key];
			for (var i = 0; i < yAxisKeysArray.length; ++i) {
				var axis = yAxisKeysArray[i];
				if (group === "change_type") {
					if (stat[axis] === undefined) {
						stat["Added"] = 0;
						stat["Removed"] = 0;
					}
					else {
						stat["Added"] = stat[axis][0];
						stat["Removed"] = stat[axis][1];
					}
				}
				else {
					if (stat[axis] === undefined) {
						stat[axis] = 0;
					}
					else {
						stat[axis] = axis_data_filter(stat[axis]);
					}
				}
			}
		}

		if (group === "change_type") {
			yAxisKeysArray = ["Added", "Removed"];
		}

		this._cache.stats = stats;

		return stats;
	}
}

var BarChartPlotter = function(e) {
	var ctx = e.drawingContext;
	var points = e.points;
	var y_bottom = e.dygraph.toDomYCoord(0);

	var bar_width = 2/3 * (points[1].canvasx - points[0].canvasx);
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

var create_subnav_filter = function(iterable, initial, label_fn, click_fn, label) {
	var items = [];
	var elements = {};
	var on_click_listener = function(item, click_fn) {
		return function(e) {
			if (e.ctrlKey) {
				var clicked = 0;
				for (var i = 0; i < items.length; ++i) {
					if (this.parentNode == items[i]) {
						clicked = i;
						break;
					}
				}
				// Invert
				if (clicked == 0) {
					items[0].className = "";
					for (var i = 1; i < items.length; ++i) {
						if (items[i].className == "active") {
							items[i].className = "";
						}
						else {
							items[i].className = "active";
						}
					}
				}
				else {
					if (items[clicked].className == "active") {
						items[clicked].className = "";
					}
					else {
						items[clicked].className = "active";
					}
				}
				var active = 0;
				for (var i = 0; i < items.length; ++i) {
					if (items[i].className == "active") {
						active++;
					}
				}
				if (active == 0) {
					items[clicked].className = "active";
				}
			}
			else {
				for (var i = 0; i < items.length; ++i) {
					items[i].className = "";
				}
				this.parentNode.className = "active";
			}

			var selected = [];
			for (var i = 0; i < items.length; ++i) {
				if (items[i].className == "active") {
					if (i === 0) {
						selected.push(null);
					}
					else {
						selected.push(iterable[i-1]);
					}
				}
			}
			click_fn(e, item, selected);
		};
	}
	var dl = document.createElement("DL");
	dl.className = "sub-nav";
	var dt = document.createElement("DT");
	dt.innerHTML = label;
	dl.appendChild(dt);
	var dd = document.createElement("DD");
	if (initial.indexOf(null) !== -1) {
		dd.className = "active";
	}
	var a = document.createElement("A");
	a.innerHTML = "All";
	a.onclick = on_click_listener(null, click_fn);
	dd.appendChild(a);
	dl.appendChild(dd);
	items.push(dd);
	for (var i = 0; i < iterable.length; ++i) {
		var dd = document.createElement("DD");
		var a = document.createElement("A");
		var aText = document.createTextNode(label_fn(iterable[i]));
		for (var j = 0; j < initial.length; ++j) {
			if (initial[j] !== null) {
				if (initial[j][1] === iterable[i][1]) {
					dd.className = "active";
				}
			}
		}
		a.onclick = on_click_listener(iterable[i], click_fn);
		a.appendChild(aText);
		dd.appendChild(a);
		dl.appendChild(dd);
		items.push(dd);
		elements[iterable[i][1]] = dd;
	}
	return {
		element: dl,
		elements: elements
	};
}

var convert_statistics_to_digraph = function(statistics)
{
	var labels = ["t"];

	var graph_data = [];
	if (statistics) {
		var keys = null;

		for (var date in statistics) {
			var stat = statistics[date];
			if (keys === null) {
				keys = [];
				for (var key in stat) {
					keys.push(key);
				}
			}
			var series = [];
			for (var i = 0; i < keys.length; ++i) {
				series.push(stat[keys[i]]);
			}
			graph_data.push([new Date(date)].concat(series));
		}
		labels = ["t"].concat(keys);
	}
	graph_data = graph_data.sort(function(a, b) { return a[0] - b[0]; });

	return {
		'data': graph_data,
		'labels': labels
	}
}

var build_filter = function(selected) {
	var filter = null;
	for (var i = 0; i < selected.length; ++i) {
		if (selected[i] === null) {
			continue;
		}
		if (filter === null) {
			filter = [];
		}
		filter.push(selected[i][1]);
	}
	return filter;
}

var set_active_class = function(node) {
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

var set_page_header_text = function(text) {
	pageHeader.innerHTML = text;
}

var get_dygraph_opts = function(type) {
	switch (type) {
		case 'ts':
			return {
				stackedGraph: true,
				plotter: BarChartPlotter,
				axes: {
					x: {
						valueFormatter: Dygraph.dateString_,
						ticker: Dygraph.dateTicker
					}
				}
			}
		case 'tsline':
			return {
				stackedGraph: true,
				axes: {
					x: {
						valueFormatter: Dygraph.dateString_,
						ticker: Dygraph.dateTicker
					}
				}
			}
		default:
			return {}
	}
}

var project_header_suffix = function(selected_projects) {
	if (selected_projects[0] === null) {
		if (projects.length === 1) {
			return projects[0][0];
		}
		else  {
			return "All";
		}
	}
	else {
		var projectNames = [];
		for (var i = 0; i < selected_projects.length; ++i) {
			var project = selected_projects[i];
			if (project === null) {
				continue;
			}
			projectNames.push(project[0]);
		}
		return projectNames.join(", ");
	}
}

var selector = new Selector(data);
var projects = selector.select().projects();
var authors = selector.select().authors();

var extensions = [];
var project_authors = [];
var project_extensions = [];

(function () {
	extensions = selector.select().extensions();
	select = selector.select("commit", "count");
	project_authors = select.authors();
	project_extensions = select.extensions();
}());

var create_graph_view = function(label, select, enabled_filters, graph_style) {
	set_page_header_text(label + " - " + project_header_suffix(selectedProjects));
	pageContent.innerHTML = "";

	var plot = document.createElement("DIV");
	plot.className = "graph";

	var dygraph_data = convert_statistics_to_digraph(select.materialize());
	var opts = get_dygraph_opts(graph_style);
	opts.labels = dygraph_data.labels;
	var graph = null;
	var authorFilterElements = [];
	var extensionFilterElements = [];
	var typeFilterElements = [];

	var apply_filters = function() {
		var author_ids = [];
		var extension_ids = [];
		for (var i = 0; i < project_authors.length; ++i) {
			author_ids.push(project_authors[i][1]);
		}
		for (var i = 0; i < project_extensions.length; ++i) {
			extension_ids.push(project_extensions[i][1]);
		}
		for (var author_id in authorFilterElements) {
			if (author_ids.indexOf(author_id) === -1) {
				authorFilterElements[author_id].style.display = "none";
			}
			else {
				authorFilterElements[author_id].style.display = "inline-block";
			}
		}
		for (var extension_id in extensionFilterElements) {
			if (extension_ids.indexOf(extension_id) === -1) {
				extensionFilterElements[extension_id].style.display = "none";
			}
			else {
				extensionFilterElements[extension_id].style.display = "inline-block";
			}
		}
		set_page_header_text(label + " - " + project_header_suffix(selectedProjects));

		var project_filter = build_filter(selectedProjects);
		var author_filter = authorFilterElements === null ? null : build_filter(selectedAuthors);
		var extension_filter = extensionFilterElements === null ? null : build_filter(selectedExtensions);
		var type_filter = typeFilterElements === null ? null : build_filter(selectedTypes);
		var filtered = select.
			filter_project(project_filter).
			filter_author(author_filter).
			filter_extension(extension_filter).
			filter_type(type_filter).
			group_y(extension_filter === null ? (author_filter === null ? null : "author") : "extension");
		var dygraph_data = convert_statistics_to_digraph(filtered.materialize());
		opts.file = dygraph_data.data;
		opts.labels = dygraph_data.labels;
		graph.updateOptions(opts);
	}

	if (enabled_filters.indexOf("project") !== -1) {
		var filter = create_subnav_filter(
			projects,
			selectedProjects,
			function(project) {
				return project[0]
			},
			function(e, project, selected) {
				selectedProjects = selected;
				var project_filter = build_filter(selectedProjects);
				var select = selector.select("commit", "count").filter_project(project_filter);
				project_authors = select.filter_author(null).filter_project(project_filter).authors();
				project_extensions = select.filter_author(null).filter_project(project_filter).extensions();
				apply_filters();
			},
			"Project:"
		);
		filter.element.setAttribute("id", "project_filter");
		filter.element.style.display = "none";
		pageContent.appendChild(filter.element);
	}

	if (authors.length > 1 && enabled_filters.indexOf("author") !== -1) {
		filter = create_subnav_filter(
			authors,
			selectedAuthors,
			function(author) {
				return author[0];
			},
			function(e, author, selected) {
				selectedAuthors = selected;
				apply_filters();
			},
			"Author:"
		);
		pageContent.appendChild(filter.element);
		authorFilterElements = filter.elements;
	}
	else {
		authorFilterElements = null;
	}

	if (enabled_filters.indexOf("extension") !== -1) {
		filter = create_subnav_filter(
			extensions,
			selectedExtensions,
			function(extension) {
				return extension[0];
			},
			function(e, extension, selected) {
				selectedExtensions = selected;
				apply_filters();
			},
			"Extension:"
		);
		pageContent.appendChild(filter.element);
		extensionFilterElements = filter.elements;
	}
	else {
		extensionFilterElements = null;
	}

	if (enabled_filters.indexOf("type") !== -1) {
		filter = create_subnav_filter(
			[["Added", "Added"], ["Removed", "Removed"]],
			selectedTypes,
			function(type) {
				return type[0];
			},
			function(e, type, selected) {
				selectedTypes = selected;
				apply_filters();
			},
			"Type:"
		);
		pageContent.appendChild(filter.element);
		typeFilterElements = filter.elements;
	}

	pageContent.appendChild(plot);
	graph = new Dygraph(plot, dygraph_data.data, opts);
	apply_filters();
}

function clicked_commits() {
	var select = selector.select("commit", "count");
	create_graph_view("Commits", select, ["project", "author"], "ts");
}

function clicked_files() {
	var select = selector.select("files", "value");
	create_graph_view("Files", select, ["project", "extension"], "tsline");
}

function clicked_lines() {
	var select = selector.select("lines", "value");
	create_graph_view("Lines", select, ["project", "extension"], "tsline");
}

function clicked_changes() {
	var select = selector.select("changes", "sum");
	create_graph_view("Changes", select, ["project", "author", "extension", "type"], "ts");
}

var menu_item_commits = document.getElementById("menu_item_commits");
menu_item_commits.onclick = function() { clicked_commits(); set_active_class(menu_item_commits); };
var menu_item_files = document.getElementById("menu_item_files");
menu_item_files.onclick = function() { clicked_files(); set_active_class(menu_item_files); };
var menu_item_lines = document.getElementById("menu_item_lines");
menu_item_lines.onclick = function() { clicked_lines(); set_active_class(menu_item_lines); };
var menu_item_changes = document.getElementById("menu_item_changes");
menu_item_changes.onclick = function() { clicked_changes(); set_active_class(menu_item_changes); };

clicked_commits();
set_active_class(menu_item_commits);
