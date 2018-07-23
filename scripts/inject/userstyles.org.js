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
	const md5_url = getMeta('stylish-md5-url');
	const style_id = md5_url.match(/\/(\d+)\.md5/)[1];
	const styleName = document.getElementById('stylish-description').innerHTML.trim();
	// Get author
	const author = document.querySelectorAll('.author-name a').innerHTML;
	const getValidKey = (k) => {
		let key = k.replace(/([^a-zA-Z0-9\-_]+)/g, '_');
		if (key.replace(/_/g, '') === '') {
			key = 'u_' + encodeURIComponent(k).replace(/%/g, '');
		}
		return key;
	};
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		let queue = [getURL('https://userstyles.org/api/v1/styles/' + style_id), getURL(md5_url)];
		if (hasAdvanced()) {
			queue.push(getAdvanced());
		}
		Promise.all(queue).then((results) => {
			let serverJson = JSON.parse(results[0]);
			let md5 = results[1];
			let advanced = null;
			if (hasAdvanced()) {
				advanced = results[2];
				// Parse advanced
				for (let i of serverJson.style_settings) {
					const install_key = getValidKey(i.install_key);
					advanced.item[install_key] = {"type": i.setting_type, "title": i.label};
					switch (i.setting_type) {
						case 'dropdown':
						case 'image':
							advanced.item[install_key].option = {};
							for (let oneOption of i.style_setting_options) {
								advanced.item[install_key].option[getValidKey(oneOption.install_key)] = {
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
			} else {
				advanced = {"item": {}, "saved": {}};
			}
			parseStyleFile(serverJson.css, {
				"name": serverJson.name,
				"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css',
				"md5Url": md5_url,
				"url": getIdUrl(),
				"author": author,
				"originalMd5": md5
			}, advanced).then((style) => {
				styleInstallByCode(style);
			});
		});
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
		let key = v.replace(/^ik-/, '');
		if (key.replace(/([^a-zA-Z0-9\-_]+)/g, '') === '') {
			return 'u_' + encodeURIComponent(key).replace(/%/g, '');
		} else {
			return key.replace(/([^a-zA-Z0-9\-_]+)/g, '_');
		}
	};
	return new Promise((resolve) => {
		let advanced = {"item": {}, "saved": {}};
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
	src.innerHTML = '(function() {\
		let fixObserver = new MutationObserver(function(mutations) {\
			checkInstallButton();\
		});\
		function checkInstallButton() {\
			let buttons = ["update_style_button"];\
			let inited = 0;\
			for (let btnId of buttons) {\
				if (document.getElementById(btnId)) {\
					inited++;\
					if (document.getElementById(btnId).getAttribute("data-xstyle")) {\
						continue;\
					}\
					document.getElementById(btnId).setAttribute("data-xstyle", 1);\
					document.getElementById(btnId).addEventListener("click", function() {\
						let newEvent = new CustomEvent("stylishInstall", {detail: null});\
						document.dispatchEvent(newEvent);\
					});\
				}\
			}\
			if (inited === buttons.length) {\
				fixObserver.disconnect();\
				fixObserver = null;\
			}\
		}\
		fixObserver.observe(document.body, {childList: true, subtree: true});\
	})();';
	document.body.appendChild(src);
}