const GTVersion = 1;
const GTPort = 4001;
let GTConnections = {};
let GTTabListener = false;

function GTOnMessage(request, sender, sendResponse) {
	const tabId = sender.tab.id;
	if (request.gt === "send") {
		if (GTConnections[tabId] && GTConnections[tabId].readyState === 1) {
			GTConnections[tabId].send(request.content);
			return;
		}
		GTInit(tabId).then(() => {
			GTConnections[tabId].send(request.content);
			sendResponse("Connected");
		})
		.catch((error) => {
			sendResponse(error);
		});
	}
	if (request.gt === "close") {
		GTClose(tabId);
		sendResponse("Closed");
	}
}

function GTInit(tabId) {
	return new Promise((resolve, reject) => {
		getURL('http://localhost:' + GTPort)
		.then(r => JSON.parse(r))
		.then(({ProtocolVersion, WebSocketPort}) => {
			if (parseFloat(ProtocolVersion) != GTVersion) {
				// Unsupported version
				reject("Unsupported version");
				return;
			}
			try {
				GTConnections[tabId] = new WebSocket('ws://localhost:' + WebSocketPort);
			} catch (e) {
				// Connect fail
				reject("Connect fail");
				return;
			}
			if (GTTabListener === false) {
				browser.tabs.onRemoved.addListener(GTTabRemove);
				browser.tabs.onUpdated.addListener(GTTabUpdate);
				browser.tabs.onReplaced.addListener(GTTabReplaced);
				GTTabListener = true;
			}
			GTConnections[tabId].onopen = function () {
				GTConnections[tabId].onclose = function () {
					GTClose(tabId);
				};
				GTConnections[tabId].onerror = function () {
					GTClose(tabId);
				};
				GTConnections[tabId].onmessage = function (event) {
					browser.tabs.sendMessage(tabId, {
						method: "GhostText",
						gt: "change",
						content: event.data
					});
				};
				resolve();
			};
		});
	})
}

function GTClose(tabId) {
	if (!GTConnections[tabId]) {
		return;
	}
	if (GTConnections[tabId].readyState !== 3) {
		try {
			GTConnections[tabId].close();
		} catch (e) {
		}
	}
	delete GTConnections[tabId];
	browser.tabs.get(tabId).then((tab) => {
		browser.tabs.sendMessage(tabId, {
			"method": "GhostText",
			"gt": "close"
		});
	}, () => {
		// Do nothing
	});
	if (Object.keys(GTConnections).length === 0) {
		browser.tabs.onRemoved.removeListener(GTTabRemove);
		browser.tabs.onUpdated.removeListener(GTTabUpdate);
		browser.tabs.onReplaced.removeListener(GTTabReplaced);
		GTTabListener = false;
	}
}

function GTTabRemove(tabId) {
	GTClose(tabId);
}

function GTTabUpdate(tabId, changeInfo) {
	if (changeInfo.url && !changeInfo.url.includes("edit.html")) {
		GTClose(tabId);
	}
}

function GTTabReplaced(newId, oldId) {
	GTClose(oldId);
}