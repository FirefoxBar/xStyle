let GTHandler = null;
let GTData = {
	"text": null,
	"selections": [],
	"title": null,
	"url": "ext.firefoxcn.net",
	"syntax": "less"
};

function GTEnable(port, handler, title, text, selection) {
	GTHandler = handler;
	GTData.title = title;
	GTData.text = text;
	GTData.selection = selection;
	return notifyBackground({
		"method": "GhostText",
		"gt": "send",
		"port": port,
		"content": JSON.stringify(GTData)
	});
}

function GTDisable() {
	return notifyBackground({
		"method": "GhostText",
		"gt": "close"
	});
}

function GTUpdate(text, selection) {
	GTData.text = text;
	GTData.selection = selection;
	notifyBackground({
		"method": "GhostText",
		"gt": "send",
		"content": JSON.stringify(GTData)
	});
}

function GTOnMessage(request, sender, sendResponse) {
	if (GTHandler === null) {
		return;
	}
	if (request.gt === "change") {
		/** @type {{text: {string}, selections: [{start: {number}, end: {number}}]}} */
		const data = JSON.parse(request.content);
		GTHandler({
			"action": "change",
			"data": data
		});
	}
	if (request.gt === "close") {
		GTHandler({
			"action": "close"
		});
	}
}