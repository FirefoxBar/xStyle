(function() {
	var param = window.location.search;
	var hash = window.location.hash;
	// check if requested by xstyle
	if (!param.includes('state=xstyle') && !hash.includes('state=xstyle')) {
		return;
	}
	var type = '';
	var code = '';
	switch (window.location.hostname) {
		case 'login.microsoftonline.com':
			if (!window.location.pathname.includes('common/oauth2/nativeclient')) {
				return;
			}
			type = 'OneDrive';
			code = /code=(.*?)&/.test(param) ? param.match(/code=(.*?)&/)[1] : param.match(/code=(.*?)$/)[1];
			break;
		case 'ext.firefoxcn.net':
			if (window.location.pathname.includes('login/callback/google.html')) {
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
	});
})();