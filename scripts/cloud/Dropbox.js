var CloudDropbox = {
	"client_id": 'odsxkcb677ld8gi',
	"api_url": 'https://api.dropboxapi.com/2/',
	"content_api_url": 'https://content.dropboxapi.com/2/',
	"getLoginUrl": function() {
		var url = 'https://www.dropbox.com/oauth2/authorize?state=xstyle&response_type=token&client_id=' + this.client_id + '&redirect_uri=' + encodeURIComponent('https://ext.firefoxcn.net/login/callback/dropbox.html');
		return url;
	},
	"loginCallback": function(code) {
		localStorage.setItem('Dropbox', JSON.stringify({"access_token": code, "expires_at": new Date().getTime() + (3600 * 1000) - 1}));
		return this.initFolder();
	},
	"getUser": function() {
		var _this = this;
		return new Promise(function(resolve){
			var user_info = JSON.parse(localStorage.getItem('Dropbox'));
			if (user_info === null) {
				resolve(null);
			}
			if (user_info.expires_at <= new Date().getTime()) {
				resolve(null);
			}
			resolve(user_info);
		});
	},
	"initFolder": function() {
		var _this = this;
		return new Promise((resolve) => {
			_this.callApi('files/list_folder', {"path": ""}, 'POST').then((result) => {
				var init = true;
				for (let f of result.entries) {
					if (f.name === 'xstyle') {
						init = false;
						break;
					}
				}
				if (init) {
					_this.callApi('files/create_folder_v2', {"path": "/xstyle", "autorename": false}, 'POST').then(resolve);
				} else {
					resolve();
				}
			});
		});
	},
	"callApi": function(apiUrl, apiData, apiMethod) {
		var _this = this;
		if (apiMethod === null || apiMethod === undefined) {
			apiMethod = 'GET';
		}
		return new Promise(function(resolve){
			_this.getUser().then(function(user) {
				if (!user) {
					resolve(null);
				}
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						var content = xhr.responseText;
						if (content.substr(0, 1) === '{' || content.substr(0, 1) === '[') {
							content = JSON.parse(content);
						}
						resolve(content);
					}
				};
				xhr.open(apiMethod, _this.api_url + apiUrl, true);
				xhr.setRequestHeader("Content-type", "application/json");
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				var sendData = apiData;
				if (typeof(apiData) === 'object') {
					sendData = JSON.stringify(apiData);
				}
				xhr.send(sendData);
			});
		});
	},
	"callContentApi": function(apiUrl, apiData, apiContent) {
		var _this = this;
		return new Promise(function(resolve){
			_this.getUser().then(function(user) {
				if (!user) {
					resolve(null);
				}
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						resolve(xhr.responseText);
					}
				};
				xhr.open('POST', _this.content_api_url + apiUrl, true);
				xhr.setRequestHeader("Content-type", "application/octet-stream");
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				xhr.setRequestHeader("Dropbox-API-Arg", JSON.stringify(apiData));
				xhr.send(apiContent ? apiContent : '');
			});
		});
	},
	"uploadFile": function(filename, content) {
		var _this = this;
		return new Promise(function(resolve){
			_this.callContentApi('files/upload', {"path": '/xstyle/' + filename}, content).then(resolve);
		});
	},
	"getFileList": function() {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('files/list_folder', {"path": "/xstyle"}, 'POST').then((result) => {
				var ret = [];
				for (let f of result.entries) {
					ret.push({
						"name": f.name,
						"size": f.size
					});
				}
				resolve(ret);
			});
		});
	},
	"getFile": function(filename) {
		var _this = this;
		return new Promise(function(resolve){
			_this.callContentApi('files/download', {"path": '/xstyle/' + filename}).then(resolve);
		});
	},
	"delete": function(filename) {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('files/delete_v2', {"path": '/xstyle/' + filename}, 'POST').then(resolve);
		});
	}
};