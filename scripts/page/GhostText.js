let GTHandler = null;
let GTData = {
	"text": null,
	"selections": {
		"start": 0,
		"end": 0
	},
	"title": null,
	"url": "ext.firefoxcn.net",
	"syntax": "less"
};

function GTEnable(handler, title, text, selection) {
	GTHandler = handler;
	GTData.title = title;
	GTData.text = text;
	notifyBackground({
		"method": "GhostText",
		"gt": "send",
		"content": JSON.stringify(GTData)
	});
}

function GTDisable() {
	notifyBackground({
		"method": "GhostText",
		"gt": "close"
	});
}

function GTUpdate(text) {
	GTData.text = text;
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