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
	parseStyleFile(code).then((json) => {
		if (!json.name || json.name === '') {
			alert(t('fileTypeUnknown'));
			return;
		}
		if (confirm(browser.i18n.getMessage('styleInstall', [json.name]))) {
			styleInstallByCode(json);
		}
	});
}

function styleInstallByCode(json) {
	//Check whether the style has been installed
	json.method = "installStyle";
	if (!json.url) {
		json.url = getIdUrl() || location.href;
	}
	browser.runtime.sendMessage(json).then((response) => {
		sendEvent("styleInstalled");
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
