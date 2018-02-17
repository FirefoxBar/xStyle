let GTHandler = null;

function GTEnable(handler, title, text, selection) {
	GTHandler = handler;
	notifyBackground({
		"method": "GhostText",
		"gt": "send",
		"content": JSON.stringify({
			"text": text,
			"selections": {
				"start": 0,
				"end": 0
			},
			"title": title,
			"url": "ext.firefoxcn.net",
			"syntax": "less"
		})
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