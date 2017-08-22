healthCheck();

function healthCheck() {
	browser.runtime.sendMessage({method: "healthCheck"}).then((ok) => {
		if (ok === undefined) { // Chrome is starting up
			healthCheck();
		} else if (!ok && confirm(t("dbError"))) {
			window.open("http://userstyles.org/dberror");
		}
	});
}
