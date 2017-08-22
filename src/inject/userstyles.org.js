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
		getURL(getMd5Url()).then(function(md5) {
			if (md5 == installedStyle.originalMd5) {
				sendEvent("styleAlreadyInstalled");
				return;
			} else {
				sendEvent("styleCanBeUpdated");
				return;
			}
		});
	} else {
		getURL(getCodeUrl()).then(function(code) {
			// this would indicate a failure (a style with settings?).
			if (code == null) {
				sendEvent("styleCanBeUpdated");
				return;
			}
			let json = JSON.parse(code);
			if (json.sections.length == installedStyle.sections.length) {
				if (json.sections.every(function(section) {
					return installedStyle.sections.some(function(installedSection) {
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
	document.querySelectorAll('#left_information > div').forEach(function(e) {
		if (e.children[0].innerHTML === 'Author') {
			author = e.children[1].innerHTML;
		}
	});
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		if (hasAdvanced()) {
			getAdvanced().then(function(advanced) {
				console.log(advanced.option);
				var cssURL = 'https://userstyles.org/styles/' + style_id + '.css?' + advanced.query;
				var css = getURL(cssURL);
				var md5 = getURL(getMd5Url());
				Promise.all([css, md5]).then(function(results) {
					var style = {
						"name": styleName,
						"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css?' + advanced.query,
						"md5Url": getMd5Url(),
						"url": getIdUrl(),
						"author": author,
						"originalMd5": results[1],
						"advanced": advanced.option,
						"sections": parseMozillaFormat(results[0])
					};
					styleInstallByCode(style);
				});
			});
		} else {
			getURL(getCodeUrl()).then(function(code) {
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
	return new Promise(function(resolve) {
        	var reader = new FileReader();
        	reader.onload = function() {
				resolve(reader.result);
        	};
        	reader.readAsDataURL(file);
	});
}
function getAdvanced() {
	return new Promise(function(resolve) {
		let inputs = {
			"select": {},
			"radio": {},
			"text": {},
			"css": parseMozillaFormat(document.getElementById('stylish-code').value)
		};
		let r = '';
		let file_count = 0;
		let area = document.getElementById('advancedsettings_area');
		//select
		area.querySelectorAll('select').forEach(function(e) {
			let options = {};
			r += e.name + '=';
			e.querySelectorAll('option').forEach(function(option) {
				options[option.value] = option.innerHTML;
				if (option.selected) {
					r += encodeURIComponent(option.value);
				}
			});
			r += '&';
			inputs.select[e.name.replace(/^ik-/, '')] = options;
		});
		//radio
		area.querySelectorAll('input[type="radio"]:checked').forEach(function(e) {
			if (e.value === 'user-url') {
				r += e.name + '=' + encodeURIComponent(e.nextElementSibling.value) + '&';
			} else if (e.value === 'user-upload') {
				file_count++;
				readImage(e.parentElement.querySelector('input[type="file"]').files[0]).then(function(dataURL) {
					r += e.name + '=' + encodeURIComponent(dataURL) + '&';
					file_count--;
					checkEnd();
				});
			} else {
				r += e.name + '=' + encodeURIComponent(e.value) + '&';
			}
		});
		area.querySelectorAll('input[type="radio"]').forEach(function(e) {
			if (e.value === 'user-url' || e.value === 'user-upload') {
				return;
			}
			if (typeof(inputs.radio[e.name.replace(/^ik-/, '')]) === 'undefined') {
				inputs.radio[e.name.replace(/^ik-/, '')] = [];
			}
			inputs.radio[e.name.replace(/^ik-/, '')].push({
				"name": e.nextElementSibling.childNodes[0].childNodes[1].textContent,
				"url": e.parentElement.querySelector('.eye_image').getAttribute('data-tip').match(/src=(.*?) /)[1]
			});
		});
		//text
		area.querySelectorAll('input[type="text"]').forEach(function(e) {
			r += e.name + '=' + encodeURIComponent(e.value) + '&';
			let p = e.parentElement;
			while (!p.classList.contains('setting_div') && p.parentElement) {
				p = p.parentElement;
			}
			inputs.text[e.name.replace(/^ik-/, '')] = p.querySelector('.title_setting').innerHTML;
		});
		//checkEnd
		function checkEnd() {
			if (file_count === 0) {
				resolve({"option": inputs, "query": r.replace(/&$/, '')});
			}
		}
		checkEnd();
	});
}
document.addEventListener("stylishInstall", usoInstall, false);
document.addEventListener("stylishUpdate", usoInstall, false);