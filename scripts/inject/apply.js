var g_disableAll = false;
var g_styleElements = {};
var iframeObserver;
var bodyObserver;
var retiredStyleIds = [];
var onlyAppliesToHtml = false;

requestStyles();

function requestStyles() {
	// If this is a Stylish page (Edit Style or Manage Styles),
	// we'll request the styles directly to minimize delay and flicker,
	// unless Chrome still starts up and the background page isn't fully loaded.
	// (Note: in this case the function may be invoked again from applyStyles.)
	var request = {method: "getStyles", matchUrl: location.href, enabled: true, asHash: true};
	if (location.href.indexOf(browser.extension.getURL("")) === 0) {
		var bg = browser.extension.getBackgroundPage();
		if (bg && bg.getStyles && bg.prefs) {
			onlyAppliesToHtml = bg.prefs.get('only-applies-html');
			initObserver();
			initListener();
			// apply styles immediately, then proceed with a normal request that will update the icon
			bg.getStyles(request).then(applyStyles);
			return;
		}
	}
	browser.runtime.sendMessage({"method": "prefGet", "name": "only-applies-html"}).then(r => {
		onlyAppliesToHtml = r;
		initListener();
		initObserver();
		browser.runtime.sendMessage(request).then(applyStyles);
	});
}
function initListener() {
	browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// Also handle special request just for the pop-up
		switch (request.method == "updatePopup" ? request.reason : request.method) {
			case "styleDeleted":
				removeStyle(request.id, document);
				break;
			case "styleUpdated":
				if (request.style.enabled) {
					retireStyle(request.style.id);
					// fallthrough to "styleAdded"
				} else {
					removeStyle(request.style.id, document);
					break;
				}
			case "styleAdded":
				if (request.style.enabled) {
					browser.runtime.sendMessage({method: "getStyles", matchUrl: location.href, enabled: true, id: request.style.id, asHash: true}).then(applyStyles);
				}
				break;
			case "styleApply":
				applyStyles(request.styles);
				break;
			case "styleReplaceAll":
				replaceAll(request.styles, document);
				break;
			case "styleDisableAll":
				disableAll(request.disableAll);
				break;
		}
	});
}

function disableAll(disable) {
	if (!disable === !g_disableAll) {
		return;
	}
	g_disableAll = disable;
	if (g_disableAll) {
		iframeObserver.disconnect();
	}

	disableSheets(g_disableAll, document);

	if (!g_disableAll && document.readyState != "loading") {
		iframeObserver.start();
	}

	function disableSheets(disable, doc) {
		Array.prototype.forEach.call(doc.styleSheets, (stylesheet) => {
			if (stylesheet.ownerNode.classList.contains("xstyle")) {
				stylesheet.disabled = disable;
			}
		});
		getDynamicIFrames(doc).forEach((iframe) => {
			if (!disable) {
				// update the IFRAME if it was created while the observer was disconnected
				addDocumentStylesToIFrame(iframe);
			}
			disableSheets(disable, iframe.contentDocument);
		});
	}
}

function removeStyle(id, doc) {
	var e = doc.getElementById("xstyle-" + id);
	delete g_styleElements["xstyle-" + id];
	if (e) {
		e.remove();
	}
	if (doc == document && Object.keys(g_styleElements).length == 0) {
		iframeObserver.disconnect();
	}
	getDynamicIFrames(doc).forEach((iframe) => {
		removeStyle(id, iframe.contentDocument);
	});
}

// to avoid page flicker when the style is updated
// instead of removing it immediately we rename its ID and queue it
// to be deleted in applyStyles after a new version is fetched and applied
function retireStyle(id, doc) {
	var deadID = "ghost-" + id;
	if (!doc) {
		doc = document;
		retiredStyleIds.push(deadID);
		delete g_styleElements["xstyle-" + id];
		// in case something went wrong and new style was never applied
		setTimeout(removeStyle.bind(null, deadID, doc), 1000);
	}
	var e = doc.getElementById("xstyle-" + id);
	if (e) {
		e.id = "xstyle-" + deadID;
	}
	getDynamicIFrames(doc).forEach((iframe) => {
		retireStyle(id, iframe.contentDocument);
	});
}

function applyStyles(styleHash) {
	if (!styleHash) { // Chrome is starting up
		requestStyles();
		return;
	}
	if ("disableAll" in styleHash) {
		disableAll(styleHash.disableAll);
		delete styleHash.disableAll;
	}

	for (var styleId in styleHash) {
		applySections(styleId, styleHash[styleId]);
	}

	if (Object.keys(g_styleElements).length) {
		initBodyObserver();
	}

	if (retiredStyleIds.length) {
		setTimeout(() => {
			while (retiredStyleIds.length) {
				removeStyle(retiredStyleIds.shift(), document);
			}
		}, 0);
	}
}

function applySections(styleId, sections) {
	var styleElement = document.getElementById("xstyle-" + styleId);
	// Already there.
	if (styleElement) {
		return;
	}
	if (onlyAppliesToHtml) {
		if (document.documentElement.tagName === 'HTML') {
			styleElement = document.createElement("style");
		} else {
			return;
		}
	} else {
		if (document.documentElement instanceof SVGSVGElement) {
			// SVG document, make an SVG style element.
			styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
		} else {
			// This will make an HTML style element. If there's SVG embedded in an HTML document, this works on the SVG too.
			styleElement = document.createElement("style");
		}
	}
	styleElement.setAttribute("id", "xstyle-" + styleId);
	styleElement.setAttribute("class", "xstyle");
	styleElement.setAttribute("type", "text/css");
	styleElement.appendChild(document.createTextNode(sections.map((section) => {
		return section.code;
	}).join("\n")));
	addStyleElement(styleElement, document);
	g_styleElements[styleElement.id] = styleElement;
}

function addStyleElement(styleElement, doc) {
	if (!doc.documentElement || doc.getElementById(styleElement.id)) {
		return;
	}
	doc.documentElement.appendChild(doc.importNode(styleElement, true)).disabled = g_disableAll;
	getDynamicIFrames(doc).forEach((iframe) => {
		if (iframeIsLoadingSrcDoc(iframe)) {
			addStyleToIFrameSrcDoc(iframe, styleElement);
		} else {
			addStyleElement(styleElement, iframe.contentDocument);
		}
	});
}

function addDocumentStylesToIFrame(iframe) {
	var doc = iframe.contentDocument;
	var srcDocIsLoading = iframeIsLoadingSrcDoc(iframe);
	for (var id in g_styleElements) {
		if (srcDocIsLoading) {
			addStyleToIFrameSrcDoc(iframe, g_styleElements[id]);
		} else {
			addStyleElement(g_styleElements[id], doc);
		}
	}
}

function addDocumentStylesToAllIFrames() {
	getDynamicIFrames(document).forEach(addDocumentStylesToIFrame);
}

// Only dynamic iframes get the parent document's styles. Other ones should get styles based on their own URLs.
function getDynamicIFrames(doc) {
	return Array.prototype.filter.call(doc.getElementsByTagName('iframe'), iframeIsDynamic);
}

function iframeIsDynamic(f) {
	var href;
	try {
		href = f.contentDocument.location.href;
	} catch (ex) {
		// Cross-origin, so it's not a dynamic iframe
		return false;
	}
	return href === document.location.href || href.indexOf("about:") === 0;
}

function iframeIsLoadingSrcDoc(f) {
	return f.srcdoc && f.contentDocument.all.length <= 3;
	// 3 nodes or less in total (html, head, body) == new empty iframe about to be overwritten by its 'srcdoc'
}

function addStyleToIFrameSrcDoc(iframe, styleElement) {
	if (g_disableAll) {
		return;
	}
	iframe.srcdoc += styleElement.outerHTML;
	// make sure the style is added in case srcdoc was malformed
	setTimeout(addStyleElement.bind(null, styleElement, iframe.contentDocument), 100);
}

function replaceAll(newStyles, doc, pass2) {
	var oldStyles = [].slice.call(doc.querySelectorAll("STYLE.xstyle" + (pass2 ? "[id$='-ghost']" : "")));
	if (!pass2) {
		oldStyles.forEach((style) => {
			style.id += "-ghost";
		});
	}
	getDynamicIFrames(doc).forEach((iframe) => {
		replaceAll(newStyles, iframe.contentDocument, pass2);
	});
	if (doc == document && !pass2) {
		g_styleElements = {};
		applyStyles(newStyles);
		replaceAll(newStyles, doc, true);
	}
	if (pass2) {
		oldStyles.forEach((style) => {
			style.remove();
		});
	}
}

function initBodyObserver() {
	if (bodyObserver) {
		return;
	}
	// move all style elements after body
	bodyObserver = new MutationObserver(() => {
		if (document.body) {
			let last_xstyle_el = document.body;
			for (const id in g_styleElements) {
				const s = document.getElementById(id);
				if (s.previousElementSibling !== last_xstyle_el) {
					last_xstyle_el.parentElement.insertBefore(s, last_xstyle_el.nextSibling);
					last_xstyle_el = s;
				} else {
					break;
				}
			}
			bodyObserver.disconnect();
			bodyObserver = null;
		}
	});
	bodyObserver.observe(document.documentElement, {childList: true});
}

// Observe dynamic IFRAMEs being added
function initObserver() {
	iframeObserver = new MutationObserver((mutations) => {
		if (mutations.length > 1000) {
			// use a much faster method for very complex pages with 100,000 mutations
			// (observer usually receives 1k-10k mutations per call)
			addDocumentStylesToAllIFrames();
			return;
		}
		// move the check out of current execution context
		// because some same-domain (!) iframes fail to load when their "contentDocument" is accessed (!)
		// namely gmail's old chat iframe talkgadget.google.com
		setTimeout(process.bind(null, mutations), 0);
	});

	function process(mutations) {
		for (var m = 0, ml = mutations.length; m < ml; m++) {
			var mutation = mutations[m];
			if (mutation.type === "childList") {
				for (var n = 0, nodes = mutation.addedNodes, nl = nodes.length; n < nl; n++) {
					var node = nodes[n];
					if (node.localName === "iframe" && iframeIsDynamic(node)) {
						addDocumentStylesToIFrame(node);
					}
				}
			}
		}
	}

	iframeObserver.start = () => {
		// will be ignored by browser if already observing
		iframeObserver.observe(document, {childList: true, subtree: true});
	}
}
