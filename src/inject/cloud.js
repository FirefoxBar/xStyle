(function() {
	var param = window.location.search;
	var hash = window.location.hash;
	// check if requested by xstyle
	if (param.indexOf('state=xstyle') <= 0 && hash.indexOf('state=xstyle') <= 0) {
		return;
	}
	var type = '';
	var code = '';
	switch (window.location.hostname) {
		case 'login.microsoftonline.com':
			if (window.location.pathname.indexOf('common/oauth2/nativeclient') < 0) {
				return;
			}
			type = 'OneDrive';
			code = /code=(.*?)&/.test(param) ? param.match(/code=(.*?)&/)[1] : param.match(/code=(.*?)$/)[1];
			break;
		case 'ext.firefoxcn.net':
			if (window.location.pathname.indexOf('login/callback/google.html') >= 0) {
				type = 'Google';
				code = hash.match(/access_token=(.*?)&/)[1];
			} else {
				return;
			}
			break;
	}
	browser.runtime.sendMessage({
		method: "cloudLogin",
		type: type,
		code: code
	}).then(function() {
		window.close();
	});
})();