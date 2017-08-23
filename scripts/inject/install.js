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
	var styleName = getMeta('xstyle-name');
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		getURL(getCodeUrl()).then((code) => {
			styleInstallByCode(JSON.parse(code));
		});
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
	var params = getParams();
	if (params.code) {
		getURL(params.code).then((code) => {
			var json = JSON.parse(code);
			if (confirm(browser.i18n.getMessage('styleInstall', [json.name]))) {
				styleInstallByCode(json);
			}
		});
	}
}

function getMeta(name) {
	var e = document.querySelector("link[rel='" + name + "']");
	return e ? e.getAttribute("href") : null;
}
