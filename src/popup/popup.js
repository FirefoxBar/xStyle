var ENABLED_CLASS = "enabled",
DISABLED_CLASS = "disabled",
ZERO_INSTALLED_CLASS = "zero-installed";

var writeStyleTemplate = document.createElement("a");
writeStyleTemplate.className = "write-style-link";

var installed = document.getElementById("installed");

var menutype;
var website;

getActiveTab(updatePopUp);

function getActiveTabPromise() {
	return new Promise(function(resolve){
		browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
			resolve(tabs[0]);
		});
	});
}

function getBodyEl(){
	return document.body;
}

function getZeroStylesEl(){
	return document.getElementById("zerostyles");
}

function getUnavailableEl(){
	return document.getElementById("unavailable");
}

function getInstalledStylesEl(){
	var installed = document.getElementById("installed");
	if (installed){
		getInstalledStylesEl = function(){
			return installed;
		}
	}
	return installed;
}

function getInstalledStylesTabContainer(){
	var installedTab = document.getElementById("tab-item-installed");
	return installedTab;
}

function getDisableAllCheckbox(){
	return document.getElementById("disable-all-checkbox");
}

function getDisableAllContainer(){
	return document.getElementById("disable-all-container");
}

function sendDisableAll(value){
	return new Promise(function(resolve){
		if (value === undefined || value === null) {
			value = !prefs.get("disableAll");
		}
		prefs.set("disableAll", value);
		notifyAllTabs({method: "styleDisableAll", disableAll: value}).then(resolve);
	});
}

function isDisabledAll(){
	return browser.extension.getBackgroundPage().prefs.get("disableAll");
}

function buildDomainForFiltering(url){
	var parsed = parseUrl(url);
	return parsed.protocol + "//" + parsed.hostname + "/";
}

getActiveTabPromise().then(function(currentTab){
	if (currentTab.url.indexOf('about:') === 0) {
		renderPageForUnavailable();
	} else {
		getInstalledStyleForDomain(currentTab.url).then(renderInstalledTab);
	}
});

function renderPageForUnavailable() {
	renderForAllCases();
	getZeroStylesEl().classList.add('hide');
	getInstalledStylesEl().classList.add('hide');
	getUnavailableEl().classList.remove('hide');
}

function renderInstalledTab(styles){
	renderForAllCases();
	if (styles.length == 0){
		renderPageForNoStyles();
	} else {
		renderPageWithStyles(styles);
	}
}

function renderPageForNoStyles(){
	getInstalledStylesTabContainer().classList.add(ZERO_INSTALLED_CLASS);
	getZeroStylesEl().classList.remove('hide');
	getInstalledStylesEl().classList.add('hide');
}

function renderPageWithStyles(styles){
	getInstalledStylesTabContainer().classList.remove(ZERO_INSTALLED_CLASS);
	getZeroStylesEl().classList.add('hide');
	getInstalledStylesEl().classList.remove('hide');
	styles.forEach(function(style){
		addStyleToInstalled(style);
	});
}

function preProcessInstalls(installsSrc){
	installsSrc = installsSrc || 1;
    var installs, devider = 1;
    if (installsSrc >= 1000000){
        devider = 1000000;
    } else if (installsSrc >= 1000){
        devider = 1000;
    }
    if (devider > 1){
        installs = installsSrc / devider;
        installs = installs.toFixed(1);
        installs = installs.replace(".0", ""); // remove the decimal part if it is 0
        switch (devider){
            case 1000:
                installs += "k";
                break;
            case 1000000:
                installs += "m";
                break;
        }
    } else {
        installs = installsSrc;
    }
    return installs;
}

function preProcessStyle(style){
    style.installsStr = preProcessInstalls(style.installs);
    style.installButtonLabel = browser.i18n.getMessage("installButtonLabel");
    return style;
}

function preProcessInstalledStyle(style){
    style.installs = style.weekly_installs;
    preProcessStyle(style);
    style.editButtonLabel = browser.i18n.getMessage("editStyleLabel");;
    style.activateButtonLabel = browser.i18n.getMessage("enableStyleLabel");
    style.deactivateButtonLabel = browser.i18n.getMessage("disableStyleLabel");
    style.deleteButtonLabel = browser.i18n.getMessage("deleteStyleLabel");
    style.additionalClass = style.enabled ? "enabled" : "disabled";
    style.active_str = browser.i18n.getMessage("styleActiveLabel");
    style.inactive_str = browser.i18n.getMessage("styleInactiveLabel");
    style.style_edit_url = "edit.html?id=" + style.id;
}

function addStyleToInstalled(style){
	preProcessInstalledStyle(style);
	var el = installedStyleToElement(style);
	if (style.author === undefined) {
		el.querySelector('.style-author').style.display = 'none';
	}
	bindHandlers(el, style);
	getInstalledStylesEl().appendChild(el);
	return el;
}

function installedStyleToElement(style){
	return MustacheTemplate.render("style-installed-item", style);
}

function renderAllSwitch(){
	if (!isDisabledAll()){
		getDisableAllCheckbox().checked = true;
		getInstalledStylesEl().classList.remove("all-off");
		getInstalledStylesEl().classList.add("all-on");
		getBodyEl().classList.remove("all-off");
		getBodyEl().classList.add("all-on");
	}else{
		getInstalledStylesEl().classList.remove("all-on");
		getInstalledStylesEl().classList.add("all-off");
		getBodyEl().classList.remove("all-on");
		getBodyEl().classList.add("all-off");
	}
}

function renderForAllCases(){
	renderAllSwitch();
	getDisableAllCheckbox().addEventListener('change', onDisableAllCheckboxChange);
	setTimeout(function(){
		getDisableAllContainer().classList.add("animation-on");
	}, 200);
}

function onDisableAllCheckboxChange(){
	sendDisableAll(!this.checked).then(renderAllSwitch);
}

function bindHandlers(el, style){
	el.querySelector(".edit").addEventListener('click', openLinkInTabOrWindow, false);
	el.querySelector(".activate").addEventListener('click', onActivateClick(style));
	el.querySelector(".deactivate").addEventListener('click', onDeactivateClick(style));
	el.querySelector(".delete").addEventListener('click', onDeleteStyleClick(style));
}

function onActivateClick(style){
	return function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
		enableStyle(style.id, true).then(onActivationStatusChanged(style.id, true));
	};
}

function onDeactivateClick(style){
	return function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
		enableStyle(style.id, false).then(onActivationStatusChanged(style.id, false));
	}
}

function onDeleteStyleClick(style){
	return function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
		deleteStyle(style.id).then(onStyleDeleted(style));
	}
}

function onStyleDeleted(style){
	return function(){
		var old = document.getElementById("installed-style-"+style.id);
		var parent = old.parentNode;
		parent.removeChild(old);
		if (getInstalledStylesEl().childNodes.length == 0){
			renderPageForNoStyles();
		}
	}
}

function onActivationStatusChanged(styleId, enabled){
	return function(){
		var old = document.getElementById("installed-style-"+styleId);
		old.classList.remove(ENABLED_CLASS);
		old.classList.remove(DISABLED_CLASS);
		old.classList.add(enabled?ENABLED_CLASS : DISABLED_CLASS);
	}
}

function parseUrl(url){
	var a = document.createElement('a');
	a.href = url;
	return a;
}

function updatePopUp(tab) {
	website = getSiteName(tab.url);
	updateSiteName(website);
	updateCreateStyleLink(getSiteName(tab.url));
}

function updateCreateStyleLink(tabDomain){
	var createNewStyleLink = document.getElementById('write-new-style-link');
	createNewStyleLink.href += "?domain="+tabDomain;
}

function updateSiteName(siteName){
	document.getElementById('sitename').innerHTML = siteName;
	document.getElementById('getFromUserstyle').href = "https://userstyles.org/styles/browse/all/" + siteName;
}

function getSiteName(tabUrl){
	if (tabUrl.indexOf('about:') === 0) {
		return /about:(\w+)/.exec(tabUrl)[0];
	}
	var a = document.createElement('a');
	a.href = tabUrl;
	return a.hostname;
}

function openLinkInTabOrWindow(event) {
	event.preventDefault();
	if (prefs.get("openEditInWindow", false)) {
		var options = {url: event.target.href}
		var wp = prefs.get("windowPosition", {});
		for (var k in wp) options[k] = wp[k];
		browser.windows.create(options);
	} else {
		openLink(event);
	}
	close();
}

function openLink(event) {
	event.preventDefault();	
	browser.runtime.sendMessage({method: "openURL", url: event.target.href});
	close();
}

function handleUpdate(style) {
	var styleElement = installed.querySelector("#installed-style-" + style.id);
	if (styleElement) {
		installed.removeChild(styleElement);
		addStyleToInstalled(style);
	} else {
		getActiveTabRealURL(function(url) {
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

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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

document.querySelectorAll(".open-manage-link").forEach(function(el) {
	el.addEventListener("click", openLink, false);
});
