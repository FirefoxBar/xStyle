browser.runtime.sendMessage({method: "getStyles", url: getIdUrl() || location.href}).then(function(response) {
	if (response.length == 0) {
		sendEvent("styleCanBeInstalled");
	} else {
		var installedStyle = response[0];
		if (installedStyle.updateUrl !== null && installedStyle.updateUrl.includes('?')) {
			sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
		}
		// maybe an update is needed
		// use the md5 if available
		if (getMd5Url() && installedStyle.md5Url && installedStyle.originalMd5) {
			getURL(getMd5Url()).then(function(md5) {
				if (md5 == installedStyle.originalMd5) {
					sendEvent("styleAlreadyInstalled", {updateUrl: installedStyle.updateUrl});
				} else {
					sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
				}
			});
		} else {
			getURL(getCodeUrl()).then(function(code) {
				// this would indicate a failure (a style with settings?).
				if (code == null) {
					sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
				}
				var json = JSON.parse(code);
				if (json.sections.length == installedStyle.sections.length) {
					if (json.sections.every(function(section) {
						return installedStyle.sections.some(function(installedSection) {
							return sectionsAreEqual(section, installedSection);
						});
					})) {
						// everything's the same
						sendEvent("styleAlreadyInstalled", {updateUrl: installedStyle.updateUrl});
						return;
					};
				}
				sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
			});
		}
	}
});

function usoInstall () {
	var md5_url = getMeta('stylish-md5-url');
	var style_id = md5_url.match(/\/(\d+)\.md5/)[1];
	var styleName = document.title.match(/(.*?)\|/)[1].trim();
	// Get author
	var author = null;
	document.querySelectorAll('#left_information > div').forEach(function(e) {
		if (e.children[0].innerHTML === 'Author') {
			author = e.children[1].innerHTML;
		}
	});
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		if (hasAdvanced()) {
			getURL(getCodeUrl()).then(function(code) {
				var style = JSON.parse(code);
				style.author = author;
				styleInstallByCode(style);
			});
		} else {
			getAdvanced().then(function(advanced) {
				var cssURL = 'https://userstyles.org/styles/' + style_id + '.css?' + advanced;
				var css = getURL(cssURL);
				var md5 = getURL(getMd5Url());
				Promise.all([css, md5]).then(function(results) {
					var style = {
						"name": styleName,
						"updateUrl": 'https://userstyles.org/styles/' + style_id + '.css?' + advanced,
						"md5Url": getMd5Url(),
						"url": getIdUrl(),
						"author": author,
						"originalMd5": results[1],
						"sections": parseMozillaFormat(results[0])
					};
					styleInstallByCode(style);
				})
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
		var r = '';
		var file_count = 0;
		var area = document.getElementById('advancedsettings_area');
		//select
		area.querySelectorAll('select').forEach(function(e) {
			r += e.name + '=';
			e.querySelectorAll('option').forEach(function(option) {
				if (option.selected) {
					r += encodeURIComponent(option.value);
				}
			});
			r += '&';
		});
		//radio
		area.querySelectorAll('input[type="radio"]:checked').forEach(function(e) {
			if (e.value === 'user-url') {
				r += e.name + '=' + encodeURIComponent(e.nextElementSibling.value) + '&';
			} else if (e.value === 'user-upload') {
				file_count++;
				readImage(e.parentElement.querySelector('input[type="file"]').files[0]).then(function(dataURL) {
					console.log(dataURL);
					r += e.name + '=' + encodeURIComponent(dataURL) + '&';
					file_count--;
					checkEnd();
				});
			} else {
				r += e.name + '=' + encodeURIComponent(e.value) + '&';
			}
		});
		//text
		area.querySelectorAll('input[type="text"]').forEach(function(e) {
			r += e.name + '=' + encodeURIComponent(e.value) + '&';
		});
		//checkEnd
		function checkEnd() {
			if (file_count === 0) {
				resolve(r.replace(/&$/, ''));
			}
		}
		checkEnd();
	});
}
document.addEventListener("stylishInstall", usoInstall, false);
document.addEventListener("stylishUpdate", usoInstall, false);