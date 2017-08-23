browser.runtime.sendMessage({method: "getStyles", url: getIdUrl() || location.href}).then((response) => {
	if (response.length == 0) {
		sendEvent("styleCanBeInstalled");
		return;
	}
	let installedStyle = response[0];
	if (installedStyle.updateUrl !== null && installedStyle.updateUrl.includes('?')) {
		sendEvent("styleCanBeUpdated");
		return;
	}
	// maybe an update is needed
	// use the md5 if available
	if (getMd5Url() && installedStyle.md5Url && installedStyle.originalMd5) {
		getURL(getMd5Url()).then((md5) => {
			if (md5 == installedStyle.originalMd5) {
				sendEvent("styleAlreadyInstalled");
				return;
			} else {
				sendEvent("styleCanBeUpdated");
				return;
			}
		});
	} else {
		getURL(getCodeUrl()).then((code) => {
			// this would indicate a failure (a style with settings?).
			if (code == null) {
				sendEvent("styleCanBeUpdated");
				return;
			}
			let json = JSON.parse(code);
			if (json.sections.length == installedStyle.sections.length) {
				if (json.sections.every((section) => {
					return installedStyle.sections.some((installedSection) => {
						return sectionsAreEqual(section, installedSection);
					});
				})) {
					// everything's the same
					sendEvent("styleAlreadyInstalled");
					return;
				};
			}
			sendEvent("styleCanBeInstalled");
		});
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
			getAdvanced().then((advanced) => {
				let cssURL = 'https://userstyles.org/styles/' + style_id + '.css?';
				for (let k in advanced.saved) {
					cssURL += 'ik-' + k + '=' + encodeURIComponent(advanced.saved[k]) + '&';
				}
				cssURL = cssURL.substr(0, url.length - 1);
				var css = getURL(cssURL);
				var md5 = getURL(getMd5Url());
				Promise.all([css, md5]).then((results) => {
					var style = {
						"name": styleName,
						"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css',
						"md5Url": getMd5Url(),
						"url": getIdUrl(),
						"author": author,
						"originalMd5": results[1],
						"advanced": advanced,
						"sections": parseMozillaFormat(results[0])
					};
					styleInstallByCode(style);
				});
			});
		} else {
			getURL(getCodeUrl()).then((code) => {
				var style = JSON.parse(code);
				style.author = author;
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
	return new Promise((resolve) => {
		let advanced = {"item": {}, "saved": {}, "css": parseMozillaFormat(document.getElementById('stylish-code').value)};
		let file_count = 0;
		let area = document.getElementById('advancedsettings_area');
		//select
		area.querySelectorAll('select').forEach((e) => {
			let options = {};
			e.querySelectorAll('option').forEach((option) => {
				options[option.value] = option.innerHTML;
				if (option.selected) {
					advanced.saved[e.name.replace(/^ik-/, '')] = option.value;
				}
			});
			advanced.item[e.name.replace(/^ik-/, '')] = {"type": "select", "option": options};
		});
		//radio
		area.querySelectorAll('input[type="radio"]:checked').forEach((e) => {
			if (e.value === 'user-url') {
				advanced.saved[e.name.replace(/^ik-/, '')] = e.nextElementSibling.value;
			} else if (e.value === 'user-upload') {
				file_count++;
				readImage(e.parentElement.querySelector('input[type="file"]').files[0]).then((dataURL) => {
					advanced.saved[e.name.replace(/^ik-/, '')] = dataURL;
					file_count--;
					checkEnd();
				});
			} else {
				advanced.saved[e.name.replace(/^ik-/, '')] = e.value;
			}
		});
		area.querySelectorAll('input[type="radio"]').forEach((e) => {
			if (e.value === 'user-url' || e.value === 'user-upload') {
				return;
			}
			if (typeof(advanced.item[e.name.replace(/^ik-/, '')]) === 'undefined') {
				advanced.item[e.name.replace(/^ik-/, '')] = {"type": "radio", "option": {}};
			}
			let name = e.nextElementSibling.childNodes[0].childNodes[1].textContent;
			let value = e.parentElement.querySelector('.eye_image').getAttribute('data-tip').match(/src=(.*?) /)[1];
			advanced.item[e.name.replace(/^ik-/, '')].option[name] = value;
		});
		//text
		area.querySelectorAll('input[type="text"]').forEach((e) => {
			advanced.item[e.name.replace(/^ik-/, '')] = e.value;
			let p = e.parentElement;
			while (!p.classList.contains('setting_div') && p.parentElement) {
				p = p.parentElement;
			}
			advanced.item[e.name.replace(/^ik-/, '')] = p.querySelector('.title_setting').innerHTML;
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