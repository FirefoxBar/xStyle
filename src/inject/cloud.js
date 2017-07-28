(function() {
	var param = window.location.search;
	// check if requested by xstyle
	if (param.indexOf('state=xstyle') <= 0) {
		return;
	}
	var type = '';
	var code = '';
	switch (window.location.hostname) {
		case 'login.microsoftonline.com':
			type = 'OneDrive';
			code = /code=(.*?)&/.test(param) ? param.match(/code=(.*?)&/)[1] : param.match(/code=(.*?)$/)[1];
			break;
	}
	console.log('redirect to extension page');
	window.location.href = browser.extension.getURL('cloud.html') + '?type=' + type + '&code=' + code;
})();