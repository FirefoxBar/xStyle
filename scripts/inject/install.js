function getCodeUrl() {
	return getMeta("xstyle-code") || getMeta("stylish-code-chrome");
}
function getMd5Url() {
	return getMeta("xstyle-md5-url") || getMeta("stylish-md5-url");
}
function getIdUrl() {
	return getMeta("xstyle-id-url") || getMeta("stylish-id-url");
}

function sendEvent(type, data) {
	if (typeof data == "undefined") {
		data = null;
	}
	var newEvent = new CustomEvent(type, {detail: data});
	document.dispatchEvent(newEvent);
}

function styleInstall () {
	getURL(getCodeUrl()).then((code) => {
		confirmAStyle(code);
	});
}

function confirmAStyle(code) {
	let json = null;
	try {
		json = JSON.parse(code);
		if (Object.keys(json.advanced.item).length > 0) {
			let saved = {};
			for (let k in json.advanced.item) {
				saved[k] = typeof(json.advanced.item[k].default) === 'undefined' ? Object.keys(json.advanced.item[k].option)[0] : json.advanced.item[k].default;
			}
			json.advanced.saved = saved;
			json.sections = applyAdvanced(json.advanced.css, json.advanced.item, json.advanced.saved);
		}
	} catch (e) {
		// is not a json file, try to parse as a .user.css file
		if (trimNewLines(code).indexOf('/* ==UserStyle==') === 0) {
			let meta = parseUCMeta(trimNewLines(code.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]));
			let body = trimNewLines(code.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
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
			alert(t('fileTypeUnknown'));
			return;
		}
	}
	if (confirm(browser.i18n.getMessage('styleInstall', [json.name]))) {
		styleInstallByCode(json);
	}
}

function styleInstallByCode(json) {
	//Check whether the style has been installed
	browser.runtime.sendMessage({method: "getStyles", url: json.url || getIdUrl() || location.href}).then((response) => {
		json.method = "saveStyle";
		if (response.length != 0) {
			json.id = response[0].id;
			delete json.name;
		}
		browser.runtime.sendMessage(json).then((response) => {
			sendEvent("styleInstalled");
		});
	});
}

document.addEventListener("xstyleInstall", styleInstall, false);

// For open page
if (window.location.href.indexOf('https://ext.firefoxcn.net/xstyle/install/open.html') === 0) {
	let params = getParams();
	if (params.code) {
		getURL(params.code).then((code) => {
			confirmAStyle(code);
		});
	}
}

function getMeta(name) {
	var e = document.querySelector("link[rel='" + name + "']");
	return e ? e.getAttribute("href") : null;
}
