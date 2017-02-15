var IMAGE_URL_NOT_AVAILABLE = "n/a",
    IMAGE_URL_DEFAULT = "images/image_na.png",
	SEARCH_INSTALLED_FROM_POPUP = "?installedfrompopup";

var writeStyleTemplate = document.createElement("a");
writeStyleTemplate.className = "write-style-link";

var installed = document.getElementById("recommended");

var STYLE_URL_ID_REGEX = /(styles\/)(\d+)/;
var menutype;
var website;

getActiveTab(updatePopUp);

checkProcessInstalledFromPopup();

function checkProcessInstalledFromPopup(){
	if (window.location.search == SEARCH_INSTALLED_FROM_POPUP
		&& prefs.get("disableAll")
		&& browser.extension.getBackgroundPage().isBrowserSessionNew()){
		var noti = document.getElementById("styles-off-notification");
		noti.classList.add("bounceIn");
		noti.classList.add("animated");
		document.body.addEventListener('click', onAction);
		browser.extension.getBackgroundPage().setBrowserSessionNotNew();
		function onAction(){
			noti.classList.remove("bounceIn");
			noti.classList.add("bounceOut");
			document.body.removeEventListener('click', onAction);
		}
	}
}

function getInstalledStyles(){
	return new Promise(function(resolve, reject){
		browser.runtime.sendMessage({method: "getStyles"}).then(resolve);
	});
}

function parseStyleId(style){
    var matches = STYLE_URL_ID_REGEX.exec(style.url);
    if (matches && matches.length == 3){
        return parseInt(matches[2]);
    } else {
        throw new Error("Can't retrieve style id. Url corrupted " + style.url);
    }
}

function getOrParseStyleId(style){
    if (style.styleid) {
        return style.styleid;
    }

    var parsed;
	try{
		parsed = parseStyleId(style);
		return parsed;
	} catch(e){
		console.error(e);
		return Math.floor(-10000 * Math.random());
	}
}

function styleIsInInstalled(style, installedStyles){
	for(var i = 0; i < installedStyles.length; i++){
		var current = installedStyles[i];
		if (current.url){
			var currentStyleId = getOrParseStyleId(current);
			if (style.styleid === currentStyleId){
				return true;
			}
		} else {
			if (style.id === current.id){
				return true;
			}
		}
	}
	return false;
}

function parseUrl(url){
	var a = document.createElement('a');
	a.href = url;
	return a;
}

function updatePopUp(tab) {
	website = getSiteName(tab.url);
	updateSiteName(website);
	updateCreateStyleLink(parseUrl(tab.url).hostname);

	var urlWillWork = /^(file|http|https|ftps?|moz\-extension):/.exec(tab.url);
}

function displayOptMessage(){
	var noConnection = document.getElementById("noServerConnection");
    noConnection.classList.remove("hide");
	document.getElementById("nostyles").classList.add("hide");
	document.getElementById("recommended").classList.add("hide");

    var localSiteName = browser.i18n.getMessage("noServerConnectionParam1"),
        localSettingsName = browser.i18n.getMessage("noServerConnectionParam2");

    var message = noConnection.querySelector('div');
    message.innerHTML = message.innerHTML
        .replace("%noServerConnectionParam1%", createLink("https://userstyles.org", localSiteName).outerHTML)
        .replace("%noServerConnectionParam2%", createLink("/manage.html", localSettingsName).outerHTML);
}

function createLink(href, name){
    var a = document.createElement('a');
    a.href = href;
    a.innerText = name;
    a.target = "_blank";
    return a;
}

function updateCreateStyleLink(tabDomain){
	var createNewStyleLink = document.getElementById('write-new-style-link');
	createNewStyleLink.href += "?domain="+tabDomain;
}

function updateSiteName(siteName){
	document.getElementById('sitename').innerHTML = siteName;
}

function getSiteName(tabUrl){
	var a = document.createElement('a');
	a.href = tabUrl;
	return a.hostname;
}

function preProcessStyles(styles){
	return new Promise(function(resolve, reject){
		var allStyles = styles.stylesCache.styles.popularstyles;
		allStyles.forEach(preProcessStyle);
        getInstalledStyles().then(function(installedStyles){
            var filter = preProcessFilterInstalledGenerator(installedStyles);
            allStyles = allStyles.filter(filter);
            allStyles = limitTo(allStyles, styles.stylesCache.popularstylestoshow);
            allStyles.forEach(preProcessImage);
            resolve(allStyles);
        });
	});
}

function limitTo(styles, limit){
    return styles.filter(function(){
        return limit-- > 0;
    });
}

function preProcessStyle(style){
    style.installsStr = preProcessInstalls(style.installs);
    style.installsTooltip = browser.i18n.getMessage("numberOfWeeklyInstalls");
    style.installButtonLabel = browser.i18n.getMessage("installButtonLabel");
    return style;
}

function preProcessFilterInstalledGenerator(installedStyles){
	return function preProcessFilterInstalled(style){
	    return !styleIsInInstalled(style, installedStyles);
	};
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

function preProcessImage(style){
    if (!style.thumbnail ||
        style.thumbnail.toLowerCase() == IMAGE_URL_NOT_AVAILABLE){
        style.thumbnail = IMAGE_URL_DEFAULT;
    }
    return style;
}

function showStyles(styles) {
	var allStyles = styles;
	allStyles.forEach(function(el){
        addStyleToRecommended(el);
	});
}

function addStyleToRecommended(style){
	var styleEl = styleToElement(style);
	bindInstallEvent(styleEl, style);
    installed.appendChild(styleEl);
}

function bindInstallEvent(styleEl, style){
	styleEl.querySelector("a.thumbnail_install").addEventListener('click', onThumbnailInstallClick(style));
}

function onThumbnailInstallClick(style){
	return function(e){
		e.preventDefault();
		installStyleFromPopup(style);
	}
}

function installStyleFromPopup(style){
	new Requester()
		.get(style.style_url.replace("styles/", "styles/chrome/") + ".json?")
		.then(function(data){
			var styleObj = JSON.parse(data);
			saveStyle(styleObj, function(){
				onStyleInstalledFromPopup(styleObj)
			});
		});
}

function onStyleInstalledFromPopup(styleData){
	window.location.search = SEARCH_INSTALLED_FROM_POPUP;
}

function styleToElement(style){
    return MustacheTemplate.render("style-item", style);
}

function createStyleElement(style) {
	var e = template.style.cloneNode(true);
	var checkbox = e.querySelector(".checker");
	checkbox.id = "style-" + style.id;
	checkbox.checked = style.enabled;

	e.setAttribute("class", "entry " + (style.enabled ? "enabled" : "disabled"));
	e.setAttribute("style-id", style.id);
	var styleName = e.querySelector(".style-name");
	styleName.appendChild(document.createTextNode(style.name));
	styleName.setAttribute("for", "style-" + style.id);
	styleName.checkbox = checkbox;
	var editLink = e.querySelector(".style-edit-link");
	editLink.setAttribute("href", editLink.getAttribute("href") + style.id);
	editLink.addEventListener("click", openLinkInTabOrWindow, false);

	styleName.addEventListener("click", function() { this.checkbox.click(); event.preventDefault(); });
	// clicking the checkbox will toggle it, and this will run after that happens
	checkbox.addEventListener("click", function() { enable(event, event.target.checked); }, false);
	e.querySelector(".enable").addEventListener("click", function() { enable(event, true); }, false);
	e.querySelector(".disable").addEventListener("click", function() { enable(event, false); }, false);

	e.querySelector(".delete").addEventListener("click", function() { doDelete(event, false); }, false);
	return e;
}

function enable(event, enabled) {
	var id = getId(event);
	enableStyle(id, enabled);
}

function doDelete() {
	// Opera can't do confirms in popups
	if (getBrowser() != "Opera") {
		if (!confirm(t('deleteStyleConfirm'))) {
			return;
		}
	}
	var id = getId(event);
	deleteStyle(id);
}

function getBrowser() {
	if (navigator.userAgent.indexOf("OPR") > -1) {
		return "Opera";
	}
	return "Chrome";
}

function getId(event) {
	var e = event.target;
	while (e) {
		if (e.hasAttribute("style-id")) {
			return e.getAttribute("style-id");
		}
		e = e.parentNode;
	}
	return null;
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
	var styleElement = installed.querySelector("[style-id='" + style.id + "']");
	if (styleElement) {
		installed.replaceChild(createStyleElement(style), styleElement);
	} else {
		getActiveTabRealURL(function(url) {
			if (browser.extension.getBackgroundPage().getApplicableSections(style, url).length) {
				// a new style for the current url is installed
				document.getElementById("unavailable").style.display = "none";
				installed.appendChild(createStyleElement(style));
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
