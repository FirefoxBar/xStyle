var CloudGoogle = {
	"client_id": '1093144396733-22kuva2susjn585850ka8euhf61n41ij.apps.googleusercontent.com',
	"scope": 'https://www.googleapis.com/auth/drive.appdata',
	"api_url": 'https://www.googleapis.com/',
	"getLoginUrl": function() {
		var url = 'https://accounts.google.com/o/oauth2/v2/auth?scope=' + this.scope + '&include_granted_scopes=true&state=xstyle&redirect_uri=' + encodeURIComponent('https://ext.firefoxcn.net/login/callback/google.html') + '&response_type=token&client_id=' + this.client_id;
		return url;
	},
	"loginCallback": function(code) {
		var _this = this;
		return new Promise(function(resolve){
			var callback = function(response) {
				var user_info = JSON.parse(response);
				user_info.expires_at = new Date().getTime() + (user_info.expires_in * 1000) - 1;
				user_info.access_token = code;
				localStorage.setItem('Google', JSON.stringify(user_info));
				resolve();
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
			xhr.open("GET", _this.api_url + 'oauth2/v3/tokeninfo?access_token=' + code, true);
			xhr.send();
		});
	},
	"getUser": function() {
		var _this = this;
		return new Promise(function(resolve){
			var user_info = JSON.parse(localStorage.getItem('Google'));
			if (user_info === null) {
				resolve(null);
			}
			if (user_info.expires_at <= new Date().getTime()) {
				resolve(null);
			}
			resolve(user_info);
		});
	},
	"callApi": function(apiUrl, apiData, apiMethod,) {
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
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				var sendData = apiData;
				if (typeof(apiData) === 'object') {
					xhr.setRequestHeader("Content-type", "application/json");
					sendData = JSON.stringify(apiData);
				}
				xhr.send(sendData);
			});
		});
	},
	"uploadFile": function(filename, content) {
		var _this = this;
		return new Promise(function(resolve){
			var UUID = (function(){
				return "xxxxxxxx-xxxx-8xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(a){
					var c = 16 * Math.random() | 0;
					return ("x" == a ? c : 3 & c | 8).toString(16)
				});
			})();
			var body = [];
			body.push("--" + UUID);
			body.push("Content-Type: application/json");
			body.push("");
			body.push(JSON.stringify({name: 'xstyle_' + filename, parents:["appDataFolder"]}));
			body.push("--" + UUID);
			body.push("Content-Type: application/octet-stream");
			body.push("Content-Transfer-Encoding: binary");
			body.push("");
			body.push(content);
			body.push("--" + UUID + "--");
			body.push("");
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
				xhr.open('POST', _this.api_url + 'upload/drive/v3/files?uploadType=multipart', true);
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				xhr.setRequestHeader("Content-Type", "multipart/related; boundary=" + UUID);
				xhr.send(body.join("\r\n"));
			});
		});
	},
	"getFileList": function() {
		var _this = this;
		return new Promise(function(resolve){
			_this.callApi('drive/v3/files?spaces=appDataFolder&orderBy=quotaBytesUsed&q=' + encodeURIComponent("name contains 'xstyle_'") + '&fields=' + encodeURIComponent('files(id, size, name, modifiedTime)')).then(function(result) {
				var ret = [];
				for (let f of result.files) {
					ret.push({
						"name": f.name.replace(/^xstyle_/, ''),
						"size": f.size,
						"data": JSON.stringify({"id": f.id})
					});
				}
				resolve(ret);
			});
		});
	},
	"getFile": function(filename, data) {
		var _this = this;
		data = JSON.parse(data);
		return new Promise(function(resolve){
			_this.callApi('drive/v3/files/' + data.id + '?spaces=appDataFolder&alt=media', '', 'GET').then(resolve);
		});
	},
	"delete": function(filename, data) {
		var _this = this;
		data = JSON.parse(data);
		return new Promise(function(resolve){
			_this.callApi('drive/v3/files/' + data.id + '?spaces=appDataFolder', '', 'DELETE').then(resolve);
		});
	}
};