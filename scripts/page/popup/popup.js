const ENABLED_CLASS = "enabled";
const DISABLED_CLASS = "disabled";
const ZERO_INSTALLED_CLASS = "zerostyles";
const UNAVAILABLE_CLASS = "unavailable";
const STYLES_CLASS = "have-styles";
const createNewStyleLink = '/edit.html?';

const installed = document.getElementById("installed");
const body = document.getElementsByTagName('body')[0];
const disableAllCheckbox = document.getElementById("disable-all-checkbox");
const writeNewMenu = document.getElementById('writeNewMenu');

let tabUrl = '';

function isDisabledAll(){
	return browser.extension.getBackgroundPage().prefs.get("disableAll");
}

function renderPageForAllCases(){
	renderAllSwitch(true);
	disableAllCheckbox.addEventListener('change', onDisableAllCheckboxChange);
}

// render for a page with no style
function renderPageForNoStyles(){
	body.classList.remove(STYLES_CLASS);
	body.classList.add(ZERO_INSTALLED_CLASS);
}

// render for a page with styles
function renderPageWithStyles(styles){
	body.classList.remove(ZERO_INSTALLED_CLASS);
	body.classList.add(STYLES_CLASS);
	styles.forEach((style)=> {
		addStyleToInstalled(style);
	});
}

function addStyleToInstalled(style){
	style.style_first_word = style.name.substr(0, 1);
	style.style_edit_url = "/edit.html?id=" + style.id;
	var el = installedStyleToElement(style);
	el.querySelector(".activate").checked = style.enabled;
	el.querySelector(".edit").addEventListener('click', openLink);
	el.querySelector(".activate").addEventListener('change', onActivateChange(style));
	if (!prefs.get('compact-popup')) {
		if (style.author === undefined) {
			el.querySelector('.style-author').style.display = 'none';
		}
		el.querySelector(".delete").addEventListener('click', onDeleteStyleClick(style));
	}
	//material
	if (typeof(componentHandler) !== 'undefined') {
		if (!prefs.get('compact-popup')) {
			componentHandler.upgradeElement(el.querySelector(".mdl-switch"), 'MaterialSwitch');
		} else {
			componentHandler.upgradeElement(el.querySelector(".mdl-checkbox"), 'MaterialCheckbox');
		}
	}
	installed.appendChild(el);
	return el;
}

function installedStyleToElement(style){
	return MustacheTemplate.render(prefs.get('compact-popup') ? "style-installed-item-compact" : "style-installed-item", style);
}

function renderAllSwitch(isFirst){
	if (!isDisabledAll()){
		disableAllCheckbox.checked = true;
		body.classList.remove("all-off");
		body.classList.add("all-on");
	}else{
		body.classList.remove("all-on");
		body.classList.add("all-off");
	}
	//material
	if (typeof(componentHandler) !== 'undefined' && isFirst) {
		componentHandler.upgradeElement(disableAllCheckbox.parentElement, 'MaterialSwitch');
	}
}

function onDisableAllCheckboxChange(){
	var disable = !this.checked;
	prefs.set("disableAll", disable);
	renderAllSwitch();
	notifyBackground({method: "styleDisableAll", disableAll: disable}).then(() => {
		notifyAllTabs({method: "styleDisableAll", disableAll: disable});
	});
}

function onActivateChange(style){
	return (e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		enableStyle(style.id, e.target.checked).then(onActivationStatusChanged(style.id, e.target.checked));
	};
}

function onDeleteStyleClick(style){
	return (e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		deleteStyle(style.id).then(() =>  {
			var old = document.getElementById("installed-style-" + style.id);
			var parent = old.parentNode;
			parent.removeChild(old);
			if (installed.childNodes.length == 0){
				renderPageForNoStyles();
			}
		});
	}
}

function onActivationStatusChanged(styleId, enabled){
	return () => {
		var old = document.getElementById("installed-style-" + styleId);
		old.classList.remove(ENABLED_CLASS);
		old.classList.remove(DISABLED_CLASS);
		old.classList.add(enabled ? ENABLED_CLASS : DISABLED_CLASS);
	}
}

function parseUrl(url){
	var a = document.createElement('a');
	a.href = url;
	return a;
}

function updateCreateStyle(url){
	if (canStyle(url)) {
		let domain = getDomains(url);
		let d = null;
		if (domain.length > 1) {
			domain.splice(-1, 1);
		}
		writeNewMenu.innerHTML = '';
		while (domain.length > 0) {
			d = domain.splice(0, 1);
			let n = document.createElement('li');
			n.setAttribute('class', "mdl-menu__item");
			n.setAttribute('data-param', 'domain=' + d[0]);
			n.appendChild(document.createTextNode(d[0]));
			n.addEventListener('click', onCreateClick);
			writeNewMenu.appendChild(n);
		}
	}
}

function onCreateClick() {
	openLink(createNewStyleLink + this.getAttribute('data-param'));
}

function getDomains(url) {
	if (url.indexOf("file:") == 0) {
		return [];
	}
	if (url.indexOf('about:') === 0) {
		return [/about:(\w+)/.exec(url)[0]];
	}
	let d = /.*?:\/*([^\/:]+)/.exec(url)[1];
	let domains = [d];
	while (d.indexOf(".") != -1) {
		d = d.substring(d.indexOf(".") + 1);
		domains.push(d);
	}
	return domains;
}


function openLink(e) {
	if (typeof(e) !== 'string') {
		if (this.href) {
			e.preventDefault();
			e = this.href;
		} else if (e.target.href) {
			e.preventDefault();
			e = e.target.href;
		} else {
			return;
		}
	}
	browser.runtime.sendMessage({method: "openURL", url: e});
	close();
}

function handleUpdate(style) {
	var styleElement = installed.querySelector("#installed-style-" + style.id);
	if (styleElement) {
		installed.removeChild(styleElement);
		addStyleToInstalled(style);
	} else {
		getActiveTabRealURL((url) => {
			if (browser.extension.getBackgroundPage().getApplicableSections(style, url).length) {
				installed.appendChild(installedStyleToElement(style));
			}
		});
	}
}

function handleDelete(id) {
	var styleElement = installed.querySelector("[style-id='" + id + "']");
	if (styleElement) {
		installed.removeChild(styleElement);
	}
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.method == "updatePopup") {
		switch (request.reason) {
			case "styleAdded":
			case "styleUpdated":
				handleUpdate(request.style);
				break;
			case "styleDeleted":
				handleDelete(request.id);
				break;
		}
	}
});

function onSearchClick() {
	let url = this.getAttribute('data-url').replace('%s', getDomains(tabUrl)[0]);
	browser.runtime.sendMessage({method: "openURL", "url": url});
	close();
}

document.addEventListener('DOMContentLoaded', () => {
	if (IS_MOBILE) {
		let n = document.createElement('link');
		n.rel = 'stylesheet';
		n.href = 'styles/page/popup-mobile.css';
		document.head.appendChild(n);
	}
	getActiveTab((tab) => {
		tabUrl = tab.url;
		updateCreateStyle(tabUrl);
		if (canStyle(tabUrl)) {
			getInstalledStyleForDomain(tabUrl).then((styles) => {
				renderPageForAllCases();
				if (styles.length == 0){
					renderPageForNoStyles();
				} else {
					renderPageWithStyles(styles);
				}
			});
		} else {
			renderPageForAllCases();
			body.classList.add(UNAVAILABLE_CLASS);
		}
	});
	document.querySelectorAll(".open-manage-link").forEach((el) => {
		el.addEventListener("click", openLink, false);
	});
	document.getElementById('searchStylesMenu').childNodes.forEach((el) => {
		el.addEventListener('click', onSearchClick);
	});
});