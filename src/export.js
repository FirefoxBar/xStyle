var propertyToCss = {urls: "url", urlPrefixes: "url-prefix", domains: "domain", regexps: "regexp"};

function init() {
	var params = getParams();
	if (!params.id) { // match should be 2 - one for the whole thing, one for the parentheses
	}
	requestStyle();
	function requestStyle() {
		browser.runtime.sendMessage({method: "getStyles", id: params.id}).then((styles) => {
			if (!styles) { // Chrome is starting up and shows export.html
				requestStyle();
				return;
			}
			var style = styles[0];
			styleId = style.id;
			initWithStyle(style);
		});
	}
}

function initWithStyle(style) {
	window.style = style;
	document.getElementById("name").value = style.name;
	document.getElementById("author").value = style.author || '';
	document.getElementById("updateUrl").value = style.updateUrl || '';
	document.getElementById("md5Url").value = style.md5Url || '';
	document.getElementById("originalMd5").value = style.originalMd5 || md5(JSON.stringify(style.sections));
	document.getElementById("url").value = style.url || "https://ext.firefoxcn.net/xstyle/md5namespace/" + document.getElementById("originalMd5").value;
	//material
	if (typeof(componentHandler) !== 'undefined') {
		componentHandler.upgradeElement(document.getElementById("name").parentElement, 'MaterialTextfield');
		componentHandler.upgradeElement(document.getElementById("author").parentElement, 'MaterialTextfield');
		componentHandler.upgradeElement(document.getElementById("updateUrl").parentElement, 'MaterialTextfield');
		componentHandler.upgradeElement(document.getElementById("md5Url").parentElement, 'MaterialTextfield');
		componentHandler.upgradeElement(document.getElementById("originalMd5").parentElement, 'MaterialTextfield');
		componentHandler.upgradeElement(document.getElementById("url").parentElement, 'MaterialTextfield');
	}
}

function doExport() {
	var result = {
		"name": document.getElementById("name").value,
		"updateUrl": document.getElementById("updateUrl").value || null,
		"md5Url": document.getElementById("md5Url").value || null,
		"originalMd5": document.getElementById("originalMd5").value || null,
		"url": document.getElementById("url").value || null,
		"author": document.getElementById("author").value || null,
		"sections": window.style.sections
	};
	// Copy md5 to clipboard
	if (isChrome || FIREFOX_VERSION >= 51) {
		var copyText = document.createElement("input");
		copyText.style = "position:fixed;top:-10px;left:-10px;width:1px;height:1px;display:block";
		document.getElementsByTagName('body')[0].appendChild(copyText);
		copyText.value = originalMd5;
		copyText.select();
		document.execCommand("Copy");
		copyText.remove();
	}
	return result;
}
function exportAsJson() {
	var style = doExport();
	if (!style) {
		return;
	}
	saveAsFile(JSON.stringify(style), 'xstyle-' + style.originalMd5 + '.json');
}
function exportAsUsercss() {
	var style = doExport();
	if (!style) {
		return;
	}
	var content = "/* ==UserStyle==\n";
	content += "@name " + style.name + "\n";
	if (style.url) {
		content += "@homepageURL " + style.url + "\n";
	}
	if (style.updateUrl) {
		content += "@updateURL " + style.updateUrl + "\n";
	}
	if (style.md5Url) {
		content += "@md5URL " + style.md5Url + "\n";
	}
	content += "@originalMD5 " + style.originalMd5 + "\n";
	content += "==/UserStyle== */\n\n";
	content += style.sections.map((section) => {
		var cssMds = [];
		for (var i in propertyToCss) {
			if (section[i]) {
				cssMds = cssMds.concat(section[i].map(function (v){
					return propertyToCss[i] + "(\"" + v.replace(/\\/g, "\\\\") + "\")";
				}));
			}
		}
		return cssMds.length ? "@-moz-document " + cssMds.join(", ") + " {\n" + section.code + "\n}" : section.code;
	}).join("\n\n");
	saveAsFile(content.trim(), 'xstyle-' + style.originalMd5 + '.user.css');
}

document.addEventListener("DOMContentLoaded", () => {
	init();
	document.getElementById('export-as-json').addEventListener('click', exportAsJson);
	document.getElementById('export-as-usercss').addEventListener('click', exportAsUsercss);
});