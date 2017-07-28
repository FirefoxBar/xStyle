var type = window.location.search.match(/type=(.*?)&/)[1];
var code = window.location.search.match(/code=(.*?)$/)[1];
var cloud;
switch (type) {
	case 'OneDrive':
		cloud = CloudOneDrive;
		break;
}
cloud.loginCallback(code).then(function() {
	window.opener.cloudCallback();
	window.close();
});