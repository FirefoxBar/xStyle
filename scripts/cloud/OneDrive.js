var CloudOneDrive = {
	"client_id": 'd742c0ec-f3ba-4ce9-949a-56507e86ca98',
	"scope": ['openid', 'offline_access', 'files.readwrite', 'files.readwrite.appfolder'],
	"api_url": 'https://graph.microsoft.com/v1.0/me/',
	"getLoginUrl": function() {
		var url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=' + this.client_id + '&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&response_mode=query&scope=' + this.scope.join(' ') + '&state=xstyle';
		return url;
	},
	"loginCallback": function(code) {
		var _this = this;
		return new Promise(function(resolve){
			var callback = function(response) {
				var user_info = JSON.parse(response);
				user_info.expires_at = new Date().getTime() + (user_info.expires_in * 1000);
				localStorage.setItem('OneDrive', JSON.stringify(user_info));
				_this.initFolder().then(resolve);
			};
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status >= 400) {
						callback(null);
					} else {
						callback(xhr.responseText);
					}
				}
			};
			xhr.open("POST", 'https://login.microsoftonline.com/common/oauth2/v2.0/token', true);
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.send('client_id=' + _this.client_id + '&scope=' + _this.scope.join(' ') + '&code=' + code + '&redirect_uri=' + encodeURIComponent('https://login.microsoftonline.com/common/oauth2/nativeclient') + '&grant_type=authorization_code');
		});
	},
	"getUser": function() {
		var _this = this;
		return new Promise(function(resolve){
			var user_info = JSON.parse(localStorage.getItem('OneDrive'));
			if (user_info === null) {
				resolve(null);
			}
			if (user_info.expires_at <= new Date().getTime()) {
				//reload the token
				var callback = function(response) {
					var uinfo = JSON.parse(response);
					uinfo.expires_at = new Date().getTime() + (uinfo.expires_in * 1000);
					localStorage.setItem('OneDrive', JSON.stringify(uinfo));
					resolve(uinfo);
				};
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						if (xhr.status >= 400) {
							resolve(null);
						} else {
							callback(xhr.responseText);
						}
					}
				};
				xhr.open("POST", 'https://login.microsoftonline.com/common/oauth2/v2.0/token', true);
				xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
				xhr.send('client_id=' + _this.client_id + '&scope=' + _this.scope.join(' ') + '&refresh_token=' + user_info.refresh_token + '&redirect_uri=' + encodeURIComponent('https://login.microsoftonline.com/common/oauth2/nativeclient') + '&grant_type=refresh_token');
			} else {
				resolve(user_info);
			}
		});
	},
	"initFolder": function() {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('drive/special/approot/children').then(function(result) {
				var init = true;
				for (let f of result.value) {
					if (f.name === 'xstyle') {
						init = false;
						break;
					}
				}
				if (init) {
					_this.callApi('drive/special/approot/children', {"name": "xstyle","folder": {}}, 'POST').then(resolve);
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
	"uploadFile": function(filename, content) {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('drive/special/approot:/xstyle/' + filename + ':/content', content, 'PUT').then(resolve);
		});
	},
	"getFileList": function() {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('drive/special/approot:/xstyle:/children').then(function(result) {
				var ret = [];
				for (let f of result.value) {
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
			_this.callApi('drive/special/approot:/xstyle/' + filename + ':/content', '', 'GET').then(resolve);
		});
	},
	"delete": function(filename) {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('drive/special/approot:/xstyle/' + filename + ':/', '', 'DELETE').then(resolve);
		});
	}
};