import utils from '../core/utils';

function getCodeUrl() {
	return getMeta("xstyle-code") || getMeta("stylish-code-chrome");
}
function getMd5Url() {
	return getMeta("xstyle-md5-url") || getMeta("stylish-md5-url");
}
function getIdUrl() {
	return getMeta("xstyle-id-url") || getMeta("stylish-id-url");
}
function getStyleName() {
	return getMeta("xstyle-name");
}

function getMeta(name) {
	var e = document.querySelector("link[rel='" + name + "']");
	return e ? e.getAttribute("href") : null;
}

function sendEvent(type, data) {
	if (typeof data == "undefined") {
		data = null;
	}
	var newEvent = new CustomEvent(type, {detail: data});
	document.dispatchEvent(newEvent);
}

function install () {
	let extParam = {};
	if (getStyleName() !== '') {
		extParam.name = getStyleName();
	}
	getURL(getCodeUrl()).then((code) => {
		confirmStyle(code, extParam);
	});
}

function confirmStyle(code, param) {
	parseStyleFile(code, param).then((json) => {
		if (!json.name || json.name === '') {
			alert(utils.t('fileTypeUnknown'));
			return;
		}
		if (confirm(utils.t('styleInstall', [json.name]))) {
			installByCode(json);
		}
	});
}

function installByCode(json) {
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
		let extParam = {};
		if (typeof(params.name) !== 'undefined') {
			extParam.name = params.name;
		}
		getURL(params.code).then((code) => {
			confirmStyle(code, extParam);
		});
	}
}

export default {
	getCodeUrl,
	getMd5Url,
	getIdUrl,
	getStyleName,
	sendEvent,
	install,
	confirmStyle,
	installByCode
};