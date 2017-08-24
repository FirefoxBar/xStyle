var lastUpdatedStyleId = null;
var installed;

function showStyles(styles) {
	styles.map(createStyleElement).forEach((e) => {
		installed.appendChild(e);
		recalculateStyleRight(e);
	});
	if (history.state) {
		window.scrollTo(0, history.state.scrollY);
	}
}

function createStyleElement(style) {
	var e = template.style.cloneNode(true);
	e.classList.add(style.enabled ? "enabled" : "disabled");
	e.setAttribute("style-id", style.id);
	if (style.updateUrl) {
		e.setAttribute("style-update-url", style.updateUrl);
	}
	if (style.md5Url) {
		e.setAttribute("style-md5-url", style.md5Url);
	}
	if (style.originalMd5) {
		e.setAttribute("style-original-md5", style.originalMd5);
	}

	var styleName = e.querySelector(".style-name");
	styleName.setAttribute('title', style.name);
	styleName.appendChild(document.createTextNode(style.name));
	var domains = [];
	var urls = [];
	var urlPrefixes = [];
	var regexps = [];
	function add(array, property) {
		style.sections.forEach((section) => {
			if (section[property]) {
				section[property].filter((value) => {
					return array.indexOf(value) === -1;
				}).forEach((value) => {
					array.push(value);
				});;
			}
		});
	}
	add(domains, 'domains');
	add(urls, 'urls');
	add(urlPrefixes, 'urlPrefixes');
	add(regexps, 'regexps');
	var appliesToToShow = [];
	if (domains)
		appliesToToShow = appliesToToShow.concat(domains);
	if (urls)
		appliesToToShow = appliesToToShow.concat(urls);
	if (urlPrefixes)
		appliesToToShow = appliesToToShow.concat(urlPrefixes.map((u) => {
			return u + "*";
		}));
	if (regexps)
		appliesToToShow = appliesToToShow.concat(regexps.map((u) => {
			return "/" + u + "/";
		}));
	var appliesTo = e.querySelector(".applies-to");
	if (appliesToToShow.length) {
		for (let line of appliesToToShow) {
			let a = document.createElement('code');
			a.appendChild(document.createTextNode(line));
			appliesTo.appendChild(a);
		}
	} else {
		appliesTo.appendChild(document.createTextNode(t('appliesToEverything')));
	}
	if (style.url) {
		e.querySelector(".homepage").href = style.url;
		e.querySelector(".homepage").classList.remove('hidden');
	}
	var editLink = e.querySelector(".style-edit-link");
	editLink.setAttribute("href", editLink.getAttribute("href") + style.id);
	var exportLink = e.querySelector(".style-export-link");
	exportLink.setAttribute("href", exportLink.getAttribute("href") + style.id);
	let advancedLink = e.querySelector(".style-advanced-link");
	if (Object.keys(style.advanced.item).length > 0) {
		advancedLink.setAttribute("href", advancedLink.getAttribute("href") + style.id);
		advancedLink.classList.remove('hidden');
	}
	e.querySelector(".enable").addEventListener("click", (event) => {
		enable(event, true);
	}, false);
	e.querySelector(".disable").addEventListener("click", (event) => {
		enable(event, false);
	}, false);
	if (style.updateUrl) {
		e.querySelector(".update").addEventListener("click", doUpdate, false);
		e.querySelector(".update").classList.remove('hidden');
	}
	e.querySelector(".delete").addEventListener("click", doDelete, false);
	//material
	if (typeof(componentHandler) !== 'undefined') {
		componentHandler.upgradeElement(e.querySelector(".update .loading"), 'MaterialSpinner');
	}
	return e;
}

// Recalculate the maximum width of the style title
function recalculateStyleRight(e) {
	var menuWidth = e.querySelector('.mdl-card__menu').offsetWidth;
	e.querySelector('.mdl-card__title').style.paddingRight = (24 + menuWidth).toString() + 'px';
}


function enable(event, enabled) {
	var id = getId(event);
	enableStyle(id, enabled);
	var styleid = getGlobalId(event);
}

function doDelete(event) {
	if (!confirm(t('deleteStyleConfirm'))) {
		return;
	}
	var id = getId(event);
	deleteStyle(id);
}

function getId(event) {
	return getStyleElement(event).getAttribute("style-id");
}

function getGlobalId(event){
	var murl = getStyleElement(event).getAttribute("style-md5-url");
	var matches = /\/(\d+)\.(md5)/.exec(murl);
	if (matches && matches.length == 3){
		return parseInt(matches[1]);
	} else {
		return "local";
	}
}

function getStyleElement(event) {
	var e = event.target;
	while (e) {
		if (e.hasAttribute("style-id")) {
			return e;
		}
		e = e.parentNode;
	}
	return null;
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.method) {
		case "styleUpdated":
			handleUpdate(request.style);
			break;
		case "styleAdded":
			var e = createStyleElement(request.style);
			installed.appendChild(e);
			recalculateStyleRight(e);
			break;
		case "styleDeleted":
			handleDelete(request.id);
			break;
		case "cloudLogin":
			cloudLoginCallback(request.type, request.code);
			break;
	}
});

function handleUpdate(style) {
	var element = createStyleElement(style);
	installed.replaceChild(element, installed.querySelector("[style-id='" + style.id + "']"));
	recalculateStyleRight(element);
	if (style.id == lastUpdatedStyleId) {
		lastUpdatedStyleId = null;
		showToast(t('updateCompleted'));
	};
}

function handleDelete(id) {
	var node = installed.querySelector("[style-id='" + id + "']");
	if (node) {
		installed.removeChild(node);
	}
}

function doUpdate(event) {
	checkUpdate(getStyleElement(event));
	var styleid = getGlobalId(event);
}

function updateAllStyles() {
	var elements = document.querySelectorAll("[style-update-url]");
	var toCheckCount = elements.length;
	var updatableCount = 0;
	elements.forEach((element) => {
		checkUpdate(element, (success) => {
			if (success) {
				++updatableCount;
			}
			if (--toCheckCount == 0) {
				showToast(t('updateAllCheckSucceededNoUpdate'));
			}
		}, true);
	});
}

function checkUpdate(element, callback, isNoToast) {
	element.querySelector(".update .loading").style.display = "inline-block";
	var id = element.getAttribute("style-id");

	browser.runtime.sendMessage({method: "getStyles", "id": id}).then((response) => {
		var style = response[0];
		if (!style.md5Url || !style.originalMd5) {
			updateStyleFullCode(style);
			if (callback) {
				callback(true);
			}
		} else {
			checkStyleUpdateMd5(style).then((needsUpdate) => {
				if (needsUpdate) {
					updateStyleFullCode(style);
					if (callback) {
						callback(true);
					}
				} else {
					handleNoNeedsUpdate(isNoToast);
					if (callback) {
						callback(false);
					}
				}
			});
		}
	});

	function handleNoNeedsUpdate(isNoToast) {
		element.querySelector(".update .loading").style.display = "none";
		if (!isNoToast) {
			showToast(t('updateCheckSucceededNoUpdate'));
		}
	}
}

function showToast(message) {
	document.getElementById('toast').MaterialSnackbar.showSnackbar({"message": message});
}

// import and export
function onSaveToFileClick(){
	getStyles({}, (styles) => {
		var text = JSON.stringify(styles);
		saveAsFile(text, generateFileName());
	});
}

function onLoadFromFileClick(){
	loadFromFile(XSTYLE_DUMP_FILE_EXT).then((result) => {
		var json = JSON.parse(result[0]);

		var i = 0, nextStyle;

		function proceed(){
			nextStyle = json[i++];
			if (nextStyle) {
				saveStyle(nextStyle, proceed);
			}else{
				i--;
				done();
			}
		}

		function done(){
			window.location.reload();
		}

		proceed();
	});
}

function onInstallFromFileClick(){
	loadFromFile('.json,.css').then((result) => {
		var filename = result[1];
		var rawText = result[0];
		// Detect file type
		var filetype = filename.match(/\.(\w+)$/);
		if (!filetype) {
			// unknow type
			showToast(t('fileTypeUnknown'));
			return;
		}
		filetype = filetype[1].toLowerCase();
		var json = null;
		switch (filetype) {
			case 'json':
				json = JSON.parse(rawText);
				delete json.id;
				break;
			case 'css':
				if (trimNewLines(rawText).indexOf('/* ==UserStyle==') === 0) {
					// is .user.css
					let meta = trimNewLines(rawText.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]);
					json = {};
					meta.split("\n").forEach((one) => {
						t = one.match(/@(\w+)([ \t]+)(.*)/);
						if (typeof(json[t[1]]) === 'undefined') {
							json[t[1]] = t[3];
						} else {
							let tempVal = json[t[1]];
							json[t[1]] = [];
							json[t[1]].push(tempVal);
							json[t[1]].push(t[3]);
						}
					});
					let body = trimNewLines(rawText.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
					json.sections = parseMozillaFormat(body);
				} else {
					// is a normal css file
					let styleName = filename.match(/^(.*?)\./)[1].replace(/([_\-])/g, ' ');
					styleName = styleName[0].toUpperCase() + styleName.substr(1);
					json = {
						"name": styleName,
						"updateUrl": null,
						"md5Url": null,
						"url": null,
						"author": null,
						"originalMd5": null,
						"sections": parseMozillaFormat(rawText)
					};
				}
				break;
			default:
				showToast(t('fileTypeUnknown'));
				return;
		}
		saveStyle(json, () => {
			window.location.reload();
		});
	});
}

function generateFileName(){
	return DateFormat(XSTYLE_DUMP_FILE_NAME);
}

// Sort
function sortStyles(method) {
	let list = document.getElementById('installed');
	let styles = Array.prototype.slice.call(list.querySelectorAll('.mdl-card'));
	styles = method(styles);
	for (let i = styles.length - 1; i >= 0; i--) {
		list.insertBefore(styles[i], list.childNodes[0]);
	}
}
function sortStylesByName(styles) {
	return styles.sort((e1, e2) => {
		let n1 = e1.querySelector('.style-name').innerHTML;
		let n2 = e2.querySelector('.style-name').innerHTML;
		return n1.localeCompare(n2);
	});
}
function sortStylesById(styles) {
	return styles.sort((e1, e2) => {
		return parseInt(e1.getAttribute('style-id')) > parseInt(e2.getAttribute('style-id'));
	});
}

function onSortIdClick() {
	prefs.set('manage.sort', 'id');
	this.parentElement.querySelector('.active').classList.remove('active');
	this.classList.add('active');
	sortStyles(sortStylesById);
}
function onSortNameClick() {
	prefs.set('manage.sort', 'name');
	this.parentElement.querySelector('.active').classList.remove('active');
	this.classList.add('active');
	sortStyles(sortStylesByName);
}

// Cloud
var cloudLoginTab = null;
function getCloud() {
	switch (document.querySelector('input[name="cloud-type"]:checked').value) {
		case 'OneDrive':
			return CloudOneDrive;
		case 'Google':
			return CloudGoogle;
	}
}

function cloudLoginCallback(type, code) {
	var cloud = getCloud();
	if (cloudLoginTab !== null) {
		browser.tabs.remove(cloudLoginTab.id).then(() => {
			cloudLoginTab = null;
		});
	}
	cloud.loginCallback(code).then(cloudLoadList);
}

function cloudLoadList() {
	var cloud = getCloud();
	document.getElementById('cloud_loaded').style.display = 'none';
	document.getElementById('cloud_beforeload').style.display = 'none';
	document.getElementById('cloud_loading').style.display = 'table-row';
	document.getElementById('cloud_filelist').querySelectorAll('tr').forEach((el) => {
		if (!el.classList.contains('special')) {
			el.remove();
		}
	});
	cloud.getUser().then((r) => {
		if (r === null) {
			browser.runtime.sendMessage({
				"method": "openURL",
				"url": cloud.getLoginUrl(),
				"active": true
			}).then((tab) => {
				cloudLoginTab = tab;
			});
		} else {
			cloud.getFileList().then((result) => {
				var p = document.getElementById('cloud_filelist');
				var tpl = p.querySelector('.template');
				result.forEach((v) => {
					var newElement = tpl.cloneNode(true);
					newElement.className = '';
					newElement.querySelector('.name').innerHTML = v.name;
					newElement.querySelector('.size').innerHTML = Math.round(v.size / 1000).toString() + 'kb';
					if (typeof(v.data) !== 'undefined') {
						newElement.setAttribute('data-cloud', v.data);
					}
					if (typeof(componentHandler) !== 'undefined') {
						newElement.querySelectorAll('.mdl-button').forEach((btn) => {
							componentHandler.upgradeElement(btn, 'MaterialButton');
						});
					}
					newElement.querySelector('.import').addEventListener('click', cloudImport);
					newElement.querySelector('.delete').addEventListener('click', cloudDelete);
					p.insertBefore(newElement, p.children[0]);
				});
				document.getElementById('cloud_loaded').style.display = 'table-row';
				document.getElementById('cloud_loading').style.display = 'none';
			});
		}
	});
}

function cloudExport() {
	var name = window.prompt(t('cloudInputFilename'), generateFileName());
	if (name) {
		document.getElementById('cloud_loaded').style.display = 'none';
		document.getElementById('cloud_beforeload').style.display = 'none';
		document.getElementById('cloud_loading').style.display = 'table-row';
		var cloud = getCloud();
		getStyles({}, (styles) => {
			cloud.uploadFile(name, JSON.stringify(styles)).then(cloudLoadList);
		});
	}
}

function cloudImport() {
	var tr = this.parentElement.parentElement;
	var filename = tr.querySelector('.name').innerHTML.trim();
	if (confirm(t('cloudImportConfirm', [filename]))) {
		this.querySelector('.mdl-spinner').style.display = 'inline-block';
		var cloud = getCloud();
		cloud.getFile(filename, tr.getAttribute('data-cloud')).then((content) => {
			if (typeof(content) === 'string') {
				content = JSON.parse(content);
			}
			var i = 0, nextStyle;
			function proceed(){
				nextStyle = content[i++];
				if (nextStyle) {
					saveStyle(nextStyle, proceed);
				}else{
					i--;
					done();
				}
			}
			function done(){
				location.reload();
			}
			proceed();
		});
	}
}

function cloudDelete() {
	var tr = this.parentElement.parentElement;
	var filename = tr.querySelector('.name').innerHTML.trim();
	if (confirm(t('cloudDeleteConfirm', [filename]))) {
		this.querySelector('.mdl-spinner').style.display = 'inline-block';
		var cloud = getCloud();
		cloud.delete(filename, tr.getAttribute('data-cloud')).then(() => {
			tr.remove();
		});
	}
}

function cloudTypeChange() {
	document.getElementById('cloud_filelist').querySelectorAll('tr').forEach((el) => {
		if (!el.classList.contains('special')) {
			el.remove();
		}
	});
	document.getElementById('cloud_loaded').style.display = 'none';
	document.getElementById('cloud_beforeload').style.display = 'table-row';
	document.getElementById('cloud_loading').style.display = 'none';
}


document.addEventListener("DOMContentLoaded", () => {
	installed = document.getElementById("installed");

	document.getElementById("update-all-styles").addEventListener("click", updateAllStyles);
	document.getElementById("install-from-file").addEventListener("click", onInstallFromFileClick);
	document.getElementById("file-all-styles").addEventListener('click', onSaveToFileClick);
	document.getElementById("unfile-all-styles").addEventListener('click', onLoadFromFileClick);

	setupLivePrefs([
		"show-badge",
		"modify-csp",
		"auto-update"
	]);
	
	//menu
	var toggleMenu = () => {
		if (document.querySelector('.mdl-layout__drawer').classList.contains('is-visible')) {
			document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
			document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
		} else {
			document.querySelector('.mdl-layout__obfuscator').classList.add('is-visible');
			document.querySelector('.mdl-layout__drawer').classList.add('is-visible');
		}
	};
	document.getElementById('menu-button').addEventListener('click', toggleMenu);
	document.querySelector('.mdl-layout__obfuscator').addEventListener('click', toggleMenu);
	
	//cloud
	document.getElementById('cloud_load_list').addEventListener('click', cloudLoadList);
	document.getElementById('cloud_reload_list').addEventListener('click', cloudLoadList);
	document.getElementById('cloud_export').addEventListener('click', cloudExport);
	document.getElementById('cloud_beforeload').style.display = 'table-row';
	document.querySelectorAll('input[name="cloud-type"]').forEach((e) => {
		e.addEventListener('change', cloudTypeChange);
	});

	//sort
	let sort = prefs.get('manage.sort');
	document.getElementById('sort-id').addEventListener('click', onSortIdClick, false);
	document.getElementById('sort-name').addEventListener('click', onSortNameClick, false);

	// init styles
	browser.runtime.sendMessage({method: "getStyles"}).then(function onGetStyles(r) {
		if (!r) { // Chrome is starting up
			browser.runtime.sendMessage({method: "getStyles"}).then(onGetStyles);
			return;
		}
		showStyles(r);
		if (sort === 'id') {
			sortStyles(sortStylesById);
			document.getElementById('sort-id').classList.add('active');
		} else {
			sortStyles(sortStylesByName);
			document.getElementById('sort-name').classList.add('active');
		}
	});
});