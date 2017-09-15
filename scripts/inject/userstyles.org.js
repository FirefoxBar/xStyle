browser.runtime.sendMessage({method: "getStyles", url: getIdUrl() || location.href}).then((response) => {
	if (response.length == 0) {
		sendEvent("styleCanBeInstalled");
		return;
	}
	let installedStyle = response[0];
	if (Object.keys(installedStyle.advanced.saved).length > 0) {
		sendEvent("styleCanBeUpdated");
		return;
	}
	// maybe an update is needed
	// use the md5 if available
	let md5_url = getMd5Url();
	if (md5_url && installedStyle.md5Url && installedStyle.originalMd5) {
		getURL(md5_url).then((md5) => {
			if (md5 == installedStyle.originalMd5) {
				sendEvent("styleAlreadyInstalled");
				return;
			} else {
				sendEvent("styleCanBeUpdated");
				return;
			}
		});
	} else {
		sendEvent("styleCanBeInstalled");
		return;
	}
});

function usoInstall () {
	var md5_url = getMeta('stylish-md5-url');
	var style_id = md5_url.match(/\/(\d+)\.md5/)[1];
	var styleName = document.getElementById('stylish-description').innerHTML.trim();
	// Get author
	var author = null;
	document.querySelectorAll('#left_information > div').forEach((e) => {
		if (e.children[0].innerHTML === 'Author') {
			author = e.children[1].innerHTML;
		}
	});
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		if (hasAdvanced()) {
			Promise.all([getURL('https://userstyles.org/api/v1/styles/' + style_id), getURL(md5_url), getAdvanced()]).then((results) => {
				let serverJson = JSON.parse(results[0]);
				let md5 = results[1];
				let advanced = results[2];
				advanced.css = parseMozillaFormat(serverJson.css);
				// Parse advanced
				for (let i of serverJson.style_settings) {
					const install_key = i.install_key.replace(/([^a-zA-Z0-9\-_]+)/g, '_');
					advanced.item[install_key] = {"type": i.setting_type, "title": i.label};
					switch (i.setting_type) {
						case 'dropdown':
						case 'image':
							advanced.item[install_key].option = {};
							for (let oneOption of i.style_setting_options) {
								advanced.item[install_key].option[oneOption.install_key.replace(/([^a-zA-Z0-9\-_]+)/g, '_')] = {
									"title": oneOption.label,
									"value": oneOption.value
								};
							}
							break;
						case 'color':
						case 'text':
							advanced.item[install_key].default = i.style_setting_options[0].value;
							break;
					}
				}
				let style = {
					"name": serverJson.name,
					"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css',
					"md5Url": md5_url,
					"url": getIdUrl(),
					"author": author,
					"originalMd5": md5,
					"advanced": advanced,
					"sections": applyAdvanced(advanced.css, advanced.item, advanced.saved)
				};
				styleInstallByCode(style);
			});
		} else {
			Promise.all([getURL('https://userstyles.org/api/v1/styles/' + style_id), getURL(md5_url)]).then((results) => {
				let serverJson = JSON.parse(results[0]);
				let md5 = results[1];
				let style = {
					"name": serverJson.name,
					"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css',
					"md5Url": md5_url,
					"url": getIdUrl(),
					"author": author,
					"originalMd5": md5,
					"advanced": {"item": {}, "saved": {}, "css": []},
					"sections": parseMozillaFormat(serverJson.css)
				};
				styleInstallByCode(style);
			});
		}
	}
}

// Does a style has advanced setting or not
function hasAdvanced() {
	return document.getElementById('advancedsettings_area') !== null;
}

// Get all advanced
function readImage(file) {
	return new Promise((resolve) => {
		var reader = new FileReader();
		reader.onload = () => {
			resolve(reader.result);
		};
		reader.readAsDataURL(file);
	});
}
function getAdvanced() {
	let removePrefix = (v) => {
		return v.replace(/^ik-/, '');
	};
	return new Promise((resolve) => {
		let advanced = {"item": {}, "saved": {}, "css": []};
		let file_count = 0;
		let area = document.getElementById('advancedsettings_area');
		//select
		area.querySelectorAll('option:checked').forEach((e) => {
			advanced.saved[removePrefix(e.parentElement.name)] = removePrefix(e.value);
		});
		//radio
		area.querySelectorAll('input[type="radio"]:checked').forEach((e) => {
			if (e.value === 'user-url') {
				advanced.saved[removePrefix(e.name)] = e.nextElementSibling.value;
			} else if (e.value === 'user-upload') {
				file_count++;
				readImage(e.parentElement.querySelector('input[type="file"]').files[0]).then((dataURL) => {
					advanced.saved[removePrefix(e.name)] = dataURL;
					file_count--;
					checkEnd();
				});
			} else {
				advanced.saved[removePrefix(e.name)] = removePrefix(e.value);
			}
		});
		//text
		area.querySelectorAll('input[type="text"]').forEach((e) => {
			advanced.saved[removePrefix(e.name)] = e.value;
		});
		//checkEnd
		function checkEnd() {
			if (file_count === 0) {
				resolve(advanced);
			}
		}
		checkEnd();
	});
}
document.addEventListener("stylishInstall", usoInstall, false);
document.addEventListener("stylishUpdate", usoInstall, false);

// Fix a uso bug
if (IS_CHROME) {
	let src = document.createElement('script');
	src.innerHTML = ';(function() {\
		function checkInstallButton() {\
			if (document.getElementById("install_style_button")) {\
				document.getElementById("install_style_button").addEventListener("click", function() {\
					let newEvent = new CustomEvent("stylishInstall", {detail: null});\
					document.dispatchEvent(newEvent);\
				});\
				return true;\
			} else {\
				return false;\
			}\
		}\
		if (!checkInstallButton()) {\
			let fixObserver = new MutationObserver(function(mutations) {\
				if (checkInstallButton()) {\
					fixObserver.disconnect();\
				}\
			});\
			fixObserver.observe(document.body, {childList: true});\
		}\
	})()';
	document.body.appendChild(src);
}