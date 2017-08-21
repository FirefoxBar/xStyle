var template = {};
tDocLoader();

function t(key, params) {
	var s = browser.i18n.getMessage(key, params)
	if (s == "") {
		throw "Missing string '" + key + "'.";
	}
	return s;
}
function o(key) {
	document.write(t(key));
}

function tHTML(html) {
	var node = document.createElement("div");
	node.innerHTML = html.replace(/>\s+</g, '><'); // spaces are removed; use &nbsp; for an explicit space
	tNodeList(node.querySelectorAll("*"));
	var child = node.removeChild(node.firstElementChild);
	node.remove();
	return child;
}

function tNodeList(nodes) {
	for (let node of nodes) {
		if (node.nodeType != 1) { // not an ELEMENT_NODE
			continue;
		}
		if (node.localName == "template") {
			tNodeList(node.content.querySelectorAll("*"));
			template[node.dataset.id] = node.content.firstElementChild;
			continue;
		}
		for (let attr of node.attributes) {
			let name = attr.nodeName;
			if (name.indexOf("i18n-") !== 0) {
				continue;
			}
			name = name.substr(5); // "i18n-".length
			let value = t(attr.value);
			switch (name) {
				case "text":
					node.insertBefore(document.createTextNode(value), node.firstChild);
					break;
				case "html":
					node.insertAdjacentHTML("afterbegin", value);
					break;
				default:
					node.setAttribute(name, value);
			}
			node.removeAttribute(attr.nodeName);
		}
	}
}

function tDocLoader() {
	// localize HEAD
	tNodeList(document.querySelectorAll("*"));

	// localize BODY
	var observer = new MutationObserver(function(mutations) {
		for (var m = 0; m < mutations.length; m++) {
			tNodeList(mutations[m].addedNodes);
		}
	});
	observer.observe(document, {subtree: true, childList: true});
	document.addEventListener("DOMContentLoaded", function() {
		observer.disconnect();
		tNodeList(document.querySelectorAll("*"));
	});
}