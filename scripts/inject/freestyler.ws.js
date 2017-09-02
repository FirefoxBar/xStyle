let fs_api_url = window.location.protocol + "//freestyler.ws/api/v2/";
function fsInstall () {
	let style_id = window.location.href.match(/style\/(\d+)\//)[1];
	let param = JSON.parse(getMeta('xstyle-fs-param'));
	getURL(fs_api_url + 'get_styles_info.php?json=' + encodeURIComponent(JSON.stringify([style_id]))).then((styleInfoJson) => {
		let styleInfo = JSON.parse(styleInfoJson)[0];
		if (confirm(browser.i18n.getMessage('styleInstall', [styleInfo.name]))) {
			getURL(fs_api_url + 'get_css.php?json=' + encodeURIComponent(JSON.stringify([{"id": style_id, "params": param}]))).then((css) => {
				let style = {
					"name": styleInfo.name,
					"url": styleInfo.url,
					"author": styleInfo.author.name,
					"advanced": {"item": {}, "saved": {}, "css": []},
					"sections": parseMozillaFormat(css)
				};
				styleInstallByCode(style);
			});
		}
	});
}
document.addEventListener('xstyleFsInstall', fsInstall);

let src = document.createElement('script');
src.innerHTML = '\
;(function() {\
	var fsInstallBtn = document.getElementById("style-install-management-style-install");\
	if (!fsInstallBtn) {\
		return;\
	}\
	var meta = document.createElement("link");\
	meta.rel = "xstyle-fs-param";\
	document.getElementsByTagName("head")[0].appendChild(meta);\
	var installBtn = fsInstallBtn.cloneNode(true);\
	installBtn.id = "xstyle-style-install";\
	installBtn.style.display = "block";\
	installBtn.children[0].id = "xstyle-button-style-install";\
	installBtn.children[0].innerHTML = "xStyle Install";\
	fsInstallBtn.parentElement.insertBefore(installBtn, fsInstallBtn);\
	installBtn.addEventListener("click", onInstallClick);\
	document.addEventListener("styleInstalled", function() {\
		installBtn.children[0].innerHTML = "Style Installed";\
		installBtn.removeEventListener("click", onInstallClick);\
	});\
	function onInstallClick(){\
		meta.href = JSON.stringify(PageParams.getParams());\
		var newEvent = new CustomEvent("xstyleFsInstall");\
		document.dispatchEvent(newEvent);\
	}\
})()';
document.getElementsByTagName("body")[0].appendChild(src);