function init() {
	var params = getParams();
	if (!params.id) { // match should be 2 - one for the whole thing, one for the parentheses
		window.location.href = 'manage.html';
		return;
	}
	requestStyle();
	function requestStyle() {
		browser.runtime.sendMessage({method: "getStyles", id: params.id}).then((styles) => {
			if (!styles) { // Chrome is starting up and shows export.html
				requestStyle();
				return;
			}
			var style = styles[0];
			initWithStyle(style);
		});
	}
}

function initWithStyle(style) {
	window.style = style;
	document.querySelector('.style-name').appendChild(document.createTextNode(style.name));
	document.getElementById("name").value = style.name;
	document.getElementById("author").value = style.author || '';
	document.getElementById("updateUrl").value = style.updateUrl || '';
	document.getElementById("md5Url").value = style.md5Url || '';
	document.getElementById("originalMd5").value = style.originalMd5 || md5(style.code);
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
		"type": "less",
		"updateUrl": document.getElementById("updateUrl").value || null,
		"md5Url": document.getElementById("md5Url").value || null,
		"originalMd5": document.getElementById("originalMd5").value || null,
		"url": document.getElementById("url").value || null,
		"author": document.getElementById("author").value || null,
		"code": window.style.code,
		"advanced": window.style.advanced || {"item": {}}
	};
	// remove saved
	delete result.advanced.saved;
	// Copy md5 to clipboard
	if (IS_CHROME || FIREFOX_VERSION >= 51) {
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
	if (Object.keys(style.advanced.item).length > 0) {
		delete style.sections;
	}
	saveAsFile(JSON.stringify(style, null, "\t"), 'xstyle-' + style.originalMd5 + '.json');
}
function exportAsUsercss() {
	var style = doExport();
	if (!style) {
		return;
	}
	var content = "/* ==UserStyle==\n";
	content += "@name " + style.name + "\n";
	content += "@type " + style.type + "\n";
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
	if (style.author) {
		content += "@author " + style.author + "\n";
	}
	if (Object.keys(style.advanced.item).length > 0) {
		for (let k in style.advanced.item) {
			let item = style.advanced.item[k];
			content += "@advanced " + item.type + ' ' + k + ' "' + item.title.replace(/"/g, '%22') + '" ';
			switch (item.type) {
				case 'text':
					content += '"' + item.default.replace(/"/g, '%22') + '"';
					break;
				case 'color':
					content += item.default;
					break;
				case 'image':
					content += "{\n";
					for (let kk in item.option) {
						content += "\t" + kk + ' "' + item.option[kk].title.replace(/"/g, '%22') + '" "' + item.option[kk].value + "\"\n";
					}
					content += "}";
					break;
				case 'dropdown':
					content += "{\n";
					for (let kk in item.option) {
						content += "\t" + kk + ' "' + item.option[kk].title.replace(/"/g, '%22') + '" <<<EOT' + "\n" + item.option[kk].value.replace(/\*\//g, '*\\/') + " EOT;\n";
					}
					content += "}";
					break;
			}
			content += "\n";
		}
	}
	content += "==/UserStyle== */\n\n";
	content += style.code;
	saveAsFile(content.trim(), 'xstyle-' + style.originalMd5 + '.user.less');
}

document.addEventListener("DOMContentLoaded", () => {
	init();
	document.getElementById('export-as-json').addEventListener('click', exportAsJson);
	document.getElementById('export-as-usercss').addEventListener('click', exportAsUsercss);
});