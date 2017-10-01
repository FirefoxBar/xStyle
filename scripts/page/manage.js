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
	if (style.lastModified) {
		e.setAttribute('style-last-modified', style.lastModified);
	}

	const styleName = e.querySelector(".style-name");
	styleName.setAttribute('title', style.name);
	styleName.appendChild(document.createTextNode(style.name));
	if (style.url && style.url.indexOf('https://ext.firefoxcn.net/xstyle/md5namespace/') < 0) {
		styleName.href = style.url;
	}
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
		e.querySelector(".update-switcher").addEventListener("click", enableStyleUpdate);
		e.querySelector(".update").classList.remove('hidden');
		e.querySelector('.update-switcher').classList.remove('hidden');
		e.querySelector('.update-switcher').classList.add(style.autoUpdate ? 'on' : 'off');
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

function enableStyleUpdate(event) {
	var id = getId(event);
	var to = this.classList.contains('off');
	saveStyle({id: id, autoUpdate: to}).then((style) => {
		handleUpdate(style);
	});
}

function enable(event, enabled) {
	var id = getId(event);
	enableStyle(id, enabled);
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
	getStyles({}).then((styles) => {
		var text = JSON.stringify(styles);
		saveAsFile(text, generateExportFileName());
	});
}

function loadStylesFromBackup(content) {
	return new Promise((resolve) => {
		var i = 0, nextStyle;
		function proceed(){
			nextStyle = content[i++];
			if (nextStyle) {
				delete nextStyle["id"];
				installStyle(nextStyle).then(proceed);
			} else {
				i--;
				resolve();
			}
		}
		proceed();
	});
}

function onLoadFromFileClick(){
	loadFromFile(XSTYLE_DUMP_FILE_EXT).then((result) => {
		var json = JSON.parse(result[0]);
		loadStylesFromBackup(json).then(() => {
			window.location.reload();
		});
	});
}

function onInstallFromFileClick(){
	loadFromFile('.json,.css', true).then((result) => {
		if (result.length > 1) {
			let installed = 0;
			for (let f of result) {
				installOneFile(f[1], f[0]).then(() => {
					installed++;
					if (installed === result.length) {
						window.location.reload();
					}
				});
			}
		} else {
			installOneFile(result[0][1], result[0][0]).then((style) => {
				if (style === false) {
					showToast(t('fileTypeUnknown'));
				} else if (Object.keys(style.advanced.item).length > 0) {
					window.location.href = 'advanced.html?id=' + style.id;
				} else {
					window.location.reload();
				}
			});
		}
		function installOneFile(filename, rawText) {
			return new Promise((resolve) => {
				// Detect file type
				let filetype = filename.match(/\.(\w+)$/);
				if (!filetype) {
					// unknow type
					resolve(false);
					return;
				}
				filetype = filetype[1].toLowerCase();
				let json = null;
				switch (filetype) {
					case 'json':
						json = JSON.parse(rawText);
						delete json.id;
						if (Object.keys(json.advanced.item).length > 0) {
							let saved = {};
							for (let k in json.advanced.item) {
								saved[k] = typeof(json.advanced.item[k].default) === 'undefined' ? Object.keys(json.advanced.item[k].option)[0] : json.advanced.item[k].default;
							}
							json.advanced.saved = saved;
							json.sections = applyAdvanced(json.advanced.css, json.advanced.item, json.advanced.saved);
						}
						break;
					case 'css':
						if (trimNewLines(rawText).indexOf('/* ==UserStyle==') === 0) {
							// is .user.css
							let meta = parseUCMeta(trimNewLines(rawText.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]));
							let body = trimNewLines(rawText.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
							json = {
								"name": meta.name,
								"updateUrl": meta.updateUrl || null,
								"md5Url": meta.md5Url || null,
								"url": meta.url || null,
								"author": meta.author || null,
								"originalMd5": meta.originalMd5 || null
							};
							if (Object.keys(meta.advanced).length > 0) {
								let saved = {};
								for (let k in meta.advanced) {
									saved[k] = typeof(meta.advanced[k].default) === 'undefined' ? Object.keys(meta.advanced[k].option)[0] : meta.advanced[k].default;
								}
								json.advanced = {"item": meta.advanced, "saved": saved, "css": parseMozillaFormat(body)};
								json.sections = applyAdvanced(json.advanced.css, json.advanced.item, json.advanced.saved);
							} else {
								json.advanced = {"item": {}, "saved": {}, "css": []};
								json.sections = parseMozillaFormat(body);
							}
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
						resolve(false);
						return;
				}
				installStyle(json).then(resolve);
			});
		}
	});
}

function generateExportFileName(){
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
function sortStylesByModified(styles) {
	return styles.sort((e1, e2) => {
		return parseInt(e1.getAttribute('style-last-modified')) < parseInt(e2.getAttribute('style-last-modified'));
	});
}
function onSortItemClick() {
	const sortMethod = this.getAttribute('data-method');
	prefs.set('manage.sort', sortMethod);
	this.parentElement.querySelector('.active').classList.remove('active');
	this.classList.add('active');
	switch (sortMethod) {
		case 'id':
			sortStyles(sortStylesById);
			break;
		case 'name':
			sortStyles(sortStylesByName);
			break;
		case 'modified':
			sortStyles(sortStylesByModified);
			break;
	}
}


// Cloud
var cloudLoginTab = null;
function getCloud() {
	switch (document.querySelector('input[name="cloud-type"]:checked').value) {
		case 'OneDrive':
			return CloudOneDrive;
		case 'Google':
			return CloudGoogle;
		case 'Dropbox':
			return CloudDropbox;
	}
}

function cloudTabListen(isRemove) {
	function listener(tabId) {
		if (cloudLoginTab && tabId === cloudLoginTab.id) {
			document.getElementById('cloud_loaded').style.display = 'none';
			document.getElementById('cloud_beforeload').style.display = 'table-row';
			document.getElementById('cloud_loading').style.display = 'none';
			cloudLoginTab = null;
			browser.tabs.onRemoved.removeListener(listener);
		}
	}
	if (isRemove) {
		browser.tabs.onRemoved.removeListener(listener);
	} else {
		browser.tabs.onRemoved.addListener(listener);
	}
}

function cloudLoginCallback(type, code) {
	var cloud = getCloud();
	if (cloudLoginTab !== null) {
		const tabId = cloudLoginTab.id;
		cloudLoginTab = null;
		cloudTabListen(true); // remove listener
		browser.tabs.remove(tabId);
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
				cloudTabListen();
			});
		} else {
			cloud.getFileList().then((result) => {
				var p = document.getElementById('cloud_filelist');
				var tpl = p.querySelector('.template');
				result.forEach((v) => {
					var newElement = tpl.cloneNode(true);
					newElement.className = '';
					newElement.querySelector('.name').appendChild(document.createTextNode(v.name));
					newElement.querySelector('.size').appendChild(document.createTextNode(Math.round(v.size / 1000).toString() + 'kb'));
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
	var name = window.prompt(t('cloudInputFilename'), generateExportFileName());
	if (name) {
		document.getElementById('cloud_loaded').style.display = 'none';
		document.getElementById('cloud_beforeload').style.display = 'none';
		document.getElementById('cloud_loading').style.display = 'table-row';
		var cloud = getCloud();
		getStyles({}).then((styles) => {
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
			loadStylesFromBackup(content).then(() => {
				window.location.reload();
			});
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
	if (cloudLoginTab !== null) {
		browser.tabs.remove(cloudLoginTab.id).then(() => {
			cloudLoginTab = null;
		});
	}
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
	document.querySelectorAll('.sort-method-list li').forEach((e) => {
		e.addEventListener('click', onSortItemClick, false);
	});

	// init styles
	browser.runtime.sendMessage({method: "getStyles"}).then(function onGetStyles(r) {
		if (!r) { // Chrome is starting up
			browser.runtime.sendMessage({method: "getStyles"}).then(onGetStyles);
			return;
		}
		showStyles(r);
		document.querySelector('.sort-method-list li[data-method="' + sort + '"]').classList.add('active');
		switch (sort) {
			case 'id':
				sortStyles(sortStylesById);
				break;
			case 'name':
				sortStyles(sortStylesByName);
				break;
			case 'modified':
				sortStyles(sortStylesByModified);
				break;
		}
	});
});