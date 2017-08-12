var lastUpdatedStyleId = null;
var installed;

var appliesToExtraTemplate = document.createElement("span");
appliesToExtraTemplate.className = "applies-to-extra";
appliesToExtraTemplate.innerHTML = "";

browser.runtime.sendMessage({method: "getStyles"}).then(showStyles);

function showStyles(styles) {
	if (!styles) { // Chrome is starting up
		browser.runtime.sendMessage({method: "getStyles"}).then(showStyles);
		return;
	}
	if (!installed) {
		// "getStyles" message callback is invoked before document is loaded,
		// postpone the action until DOMContentLoaded is fired
		document.xstyleStyles = styles;
		return;
	}
	styles.sort(function(a, b) { return a.name.localeCompare(b.name)});
	styles.map(createStyleElement).forEach(function(e) {
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
		style.sections.forEach(function(section) {
			if (section[property]) {
				section[property].filter(function(value) {
					return array.indexOf(value) == -1;
				}).forEach(function(value) {
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
		appliesToToShow = appliesToToShow.concat(urlPrefixes.map(function(u) { return u + "*"; }));
	if (regexps)
		appliesToToShow = appliesToToShow.concat(regexps.map(function(u) { return "/" + u + "/"; }));
	var appliesToString = "";
	var showAppliesToExtra = false;
	if (appliesToToShow.length == "")
		appliesToString = t('appliesToEverything');
	else if (appliesToToShow.length <= 10)
		appliesToString = appliesToToShow.join(", ");
	else {
		appliesToString = appliesToToShow.slice(0, 10).join(", ");
		showAppliesToExtra = true;
	}
	e.querySelector(".applies-to").appendChild(document.createTextNode(appliesToString));
	if (showAppliesToExtra) {
		e.querySelector(".applies-to").appendChild(appliesToExtraTemplate.cloneNode(true));
	}
	if (style.url) {
		e.querySelector(".homepage").href = style.url;
		e.querySelector(".homepage").classList.remove('hidden');
	}
	var editLink = e.querySelector(".style-edit-link");
	editLink.setAttribute("href", editLink.getAttribute("href") + style.id);
	var exportLink = e.querySelector(".style-export-link");
	exportLink.setAttribute("href", exportLink.getAttribute("href") + style.id);
	e.querySelector(".enable").addEventListener("click", function(event) { enable(event, true); }, false);
	e.querySelector(".disable").addEventListener("click", function(event) { enable(event, false); }, false);
	if (style.updateUrl) {
		e.querySelector(".check-update").addEventListener("click", doCheckUpdate, false);
		e.querySelector(".check-update").classList.remove('hidden');
	}
	e.querySelector(".update").addEventListener("click", doUpdate, false);
	e.querySelector(".delete").addEventListener("click", doDelete, false);
	//material
	if (typeof(componentHandler) !== 'undefined') {
		componentHandler.upgradeElement(e.querySelector(".check-update .loading"), 'MaterialSpinner');
	}
	return e;
}

// Recalculate the maximum width of the style title
function recalculateStyleRight(e) {
	var menuWidth = e.querySelector('.mdl-card__menu').offsetWidth;
	console.log(e.querySelector('.mdl-card__menu'));
	console.log(menuWidth);
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

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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

function doCheckUpdate(event) {
	checkUpdate(getStyleElement(event));
	var styleid = getGlobalId(event);
}

function applyUpdateAll() {
	var btnApply = document.getElementById("apply-all-updates");
	btnApply.disabled = true;
	setTimeout(function() {
		btnApply.style.display = "none";
		btnApply.disabled = false;
	}, 1000);

	document.querySelectorAll(".can-update .update").forEach(function(button) {
		button.click();
	});
}

function checkUpdateAll() {
	var btnCheck = document.getElementById("check-all-updates");
	var btnApply = document.getElementById("apply-all-updates");

	btnCheck.disabled = true;
	btnApply.classList.add("hidden");

	var elements = document.querySelectorAll("[style-update-url]");
	var toCheckCount = elements.length;
	var updatableCount = 0;
	elements.forEach(function(element) {
		checkUpdate(element, function(success) {
			if (success) {
				++updatableCount;
			}
			if (--toCheckCount == 0) {
				btnCheck.disabled = false;
				if (updatableCount) {
					btnApply.classList.remove("hidden");
				} else {
					showToast(t('updateAllCheckSucceededNoUpdate'));
				}
			}
		}, true);
	});
}

function checkUpdate(element, callback, isNoToast) {
	element.querySelector(".check-update .loading").style.display = "inline-block";
	element.className = element.className.replace("checking-update", "").replace("no-update", "").replace("can-update", "") + " checking-update";
	var id = element.getAttribute("style-id");
	var url = element.getAttribute("style-update-url");
	var md5Url = element.getAttribute("style-md5-url");
	var originalMd5 = element.getAttribute("style-original-md5");

	function handleSuccess(forceUpdate, serverJson) {
		browser.runtime.sendMessage({method: "getStyles", id: id}).then(function(styles) {
			var style = styles[0];
			var needsUpdate = false;
			if (!forceUpdate && codeIsEqual(style.sections, serverJson.sections)) {
				handleNeedsUpdate("no", id, serverJson, isNoToast);
			} else {
				handleNeedsUpdate("yes", id, serverJson, isNoToast);
				needsUpdate = true;
			}
			if (callback) {
				callback(needsUpdate);
			}
		});
	}

	function handleFailure(status) {
		if (status == 0) {
			handleNeedsUpdate(t('updateCheckFailServerUnreachable'), id, null, isNoToast);
		} else {
			handleNeedsUpdate(t('updateCheckFailBadResponseCode', [status]), id, null, isNoToast);
		}
		if (callback) {
			callback(false);
		}
	}

	if (!md5Url || !originalMd5) {
		checkUpdateFullCode(url, false, handleSuccess, handleFailure)
	} else {
		checkUpdateMd5(originalMd5, md5Url, function(needsUpdate) {
			if (needsUpdate) {
				// If the md5 shows a change we will update regardless of whether the code looks different
				checkUpdateFullCode(url, true, handleSuccess, handleFailure);
			} else {
				handleNeedsUpdate("no", id, null, isNoToast);
				if (callback) {
					callback(false);
				}
			}
		}, handleFailure);
	}
}

function checkUpdateFullCode(url, forceUpdate, successCallback, failureCallback) {
	getURL(url).then(function(responseText) {
		successCallback(forceUpdate, JSON.parse(responseText));
	}).catch(failureCallback);
}

function checkUpdateMd5(originalMd5, md5Url, successCallback, failureCallback) {
	getURL(md5Url).then(function(responseText) {
		if (responseText.length != 32) {
			failureCallback(-1);
			return;
		}
		successCallback(responseText != originalMd5);
	}).catch(failureCallback);
}

function handleNeedsUpdate(needsUpdate, id, serverJson, isNoToast) {
	var e = document.querySelector("[style-id='" + id + "']");
	e.className = e.className.replace("checking-update", "");
	e.querySelector(".check-update .loading").style.display = "none";
	switch (needsUpdate) {
		case "yes":
			e.updatedCode = serverJson;
			e.querySelector('.update').style.display = 'inline-block';
			recalculateStyleRight(e);
			return;
		case "no":
			needsUpdate = t('updateCheckSucceededNoUpdate');
			break;
	}
	if (!isNoToast) {
		showToast(needsUpdate);
	}
}

function doUpdate(event) {
	var element = getStyleElement(event);

	var updatedCode = element.updatedCode;
	// update everything but name
	delete updatedCode.name;
	updatedCode.id = element.getAttribute('style-id');
	updatedCode.method = "saveStyle";

	// updating the UI will be handled by the general update listener
	lastUpdatedStyleId = updatedCode.id;
	browser.runtime.sendMessage(updatedCode);
}

function showToast(message) {
	document.getElementById('toast').MaterialSnackbar.showSnackbar({"message": message});
}

// import and export
function onSaveToFileClick(){
	getStyles({}, function(styles){
		var text = JSON.stringify(styles);
		saveAsFile(text, generateFileName());
	});
}

function onLoadFromFileClick(){
	loadFromFile(XSTYLE_DUMP_FILE_EXT).then(function(rawText){
		var json = JSON.parse(rawText);

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
	loadFromFile(XSTYLE_DUMP_FILE_EXT).then(function(rawText){
		var json = JSON.parse(rawText);
		delete json.id;
		saveStyle(json, function() {
			window.location.reload();
		});
	});
}

function generateFileName(){
	return DateFormat(XSTYLE_DUMP_FILE_NAME);
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
		browser.tabs.remove(cloudLoginTab.id).then(function() {
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
	document.getElementById('cloud_filelist').querySelectorAll('tr').forEach(function(el) {
		if (!el.classList.contains('special')) {
			el.remove();
		}
	});
	cloud.getUser().then(function(r) {
		if (r === null) {
			browser.runtime.sendMessage({
				"method": "openURL",
				"url": cloud.getLoginUrl(),
				"active": true
			}).then(function(tab) {
				cloudLoginTab = tab;
			});
		} else {
			cloud.getFileList().then(function(result) {
				var p = document.getElementById('cloud_filelist');
				var template = p.querySelector('.template');
				result.forEach(function(v) {
					var newElement = template.cloneNode(true);
					newElement.className = '';
					newElement.querySelector('.name').innerHTML = v.name;
					newElement.querySelector('.size').innerHTML = Math.round(v.size / 1000).toString() + 'kb';
					if (typeof(v.data) !== 'undefined') {
						newElement.setAttribute('data-cloud', v.data);
					}
					if (typeof(componentHandler) !== 'undefined') {
						newElement.querySelectorAll('.mdl-button').forEach(function(btn) {
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
		getStyles({}, function(styles){
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
		cloud.getFile(filename, tr.getAttribute('data-cloud')).then(function(content) {
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
		cloud.delete(filename, tr.getAttribute('data-cloud')).then(function() {
			tr.remove();
		});
	}
}

function cloudTypeChange() {
	document.getElementById('cloud_filelist').querySelectorAll('tr').forEach(function(el) {
		if (!el.classList.contains('special')) {
			el.remove();
		}
	});
	document.getElementById('cloud_loaded').style.display = 'none';
	document.getElementById('cloud_beforeload').style.display = 'table-row';
	document.getElementById('cloud_loading').style.display = 'none';
}


document.addEventListener("DOMContentLoaded", function() {
	installed = document.getElementById("installed");
	if (document.xstyleStyles) {
		showStyles(document.xstyleStyles);
		delete document.xstyleStyles;
	}

	document.getElementById("check-all-updates").addEventListener("click", checkUpdateAll);
	document.getElementById("install-from-file").addEventListener("click", onInstallFromFileClick);
	document.getElementById("apply-all-updates").addEventListener("click", applyUpdateAll);
	document.getElementById("file-all-styles").addEventListener('click', onSaveToFileClick);
	document.getElementById("unfile-all-styles").addEventListener('click', onLoadFromFileClick);

	setupLivePrefs([
		"show-badge",
		"modify-csp",
		"auto-update"
	]);
	
	//menu
	var toggleMenu = function() {
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
	document.querySelectorAll('input[name="cloud-type"]').forEach(function(e) {
		e.addEventListener('change', cloudTypeChange);
	});
});