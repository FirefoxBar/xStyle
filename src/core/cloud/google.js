export default {
	"client_id": '1093144396733-22kuva2susjn585850ka8euhf61n41ij.apps.googleusercontent.com',
	"scope": 'https://www.googleapis.com/auth/drive.appdata',
	"api_url": 'https://www.googleapis.com/',
	getLoginUrl() {
		return 'https://accounts.google.com/o/oauth2/v2/auth?scope=' + this.scope + '&include_granted_scopes=true&state=xstyle&redirect_uri=' + encodeURIComponent('https://ext.firefoxcn.net/login/callback/google.html') + '&response_type=token&client_id=' + this.client_id;
	},
	loginCallback(code) {
		return new Promise(resolve => {
			const callback = (response) => {
				const user_info = JSON.parse(response);
				user_info.expires_at = new Date().getTime() + (user_info.expires_in * 1000) - 1;
				user_info.access_token = code;
				localStorage.setItem('Google', JSON.stringify(user_info));
				resolve();
			};
			const xhr = new XMLHttpRequest();
			xhr.onreadystatechange = () => {
				if (xhr.readyState == 4) {
					if (xhr.status >= 400) {
						callback(null);
					} else {
						callback(xhr.responseText);
					}
				}
			};
			xhr.open("GET", this.api_url + 'oauth2/v3/tokeninfo?access_token=' + code, true);
			xhr.send();
		});
	},
	getUser() {
		return new Promise(resolve => {
			if (!localStorage || !localStorage.getItem('Google')) {
				resolve(null);
			}
			const user_info = JSON.parse(localStorage.getItem('Google'));
			if (user_info === null) {
				resolve(null);
			}
			if (user_info.expires_at <= new Date().getTime()) {
				resolve(null);
			}
			resolve(user_info);
		});
	},
	callApi(apiUrl, apiData, apiMethod,) {
		if (apiMethod === null || apiMethod === undefined) {
			apiMethod = 'GET';
		}
		return new Promise(resolve => {
			this.getUser().then(user => {
				if (!user) {
					resolve(null);
				}
				const xhr = new XMLHttpRequest();
				xhr.onreadystatechange = () => {
					if (xhr.readyState == 4) {
						var content = xhr.responseText;
						if (content.substr(0, 1) === '{' || content.substr(0, 1) === '[') {
							content = JSON.parse(content);
						}
						resolve(content);
					}
				};
				xhr.open(apiMethod, this.api_url + apiUrl, true);
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				let sendData = apiData;
				if (typeof(apiData) === 'object') {
					xhr.setRequestHeader("Content-type", "application/json");
					sendData = JSON.stringify(apiData);
				}
				xhr.send(sendData);
			});
		});
	},
	uploadFile(filename, content) {
		return new Promise(resolve => {
			const UUID = (() => {
				return "xxxxxxxx-xxxx-8xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(a){
					var c = 16 * Math.random() | 0;
					return ("x" == a ? c : 3 & c | 8).toString(16)
				});
			})();
			const body = [];
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
			this.getUser().then(user => {
				if (!user) {
					resolve(null);
				}
				const xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						let content = xhr.responseText;
						if (content.substr(0, 1) === '{' || content.substr(0, 1) === '[') {
							content = JSON.parse(content);
						}
						resolve(content);
					}
				};
				xhr.open('POST', this.api_url + 'upload/drive/v3/files?uploadType=multipart', true);
				xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
				xhr.setRequestHeader("Content-Type", "multipart/related; boundary=" + UUID);
				xhr.send(body.join("\r\n"));
			});
		});
	},
	getFileList() {
		return new Promise(resolve => {
			this.callApi('drive/v3/files?spaces=appDataFolder&orderBy=quotaBytesUsed&q=' + encodeURIComponent("name contains 'xstyle_'") + '&fields=' + encodeURIComponent('files(id, size, name, modifiedTime)'))
			.then(result => {
				const ret = [];
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
	getFile(filename, data) {
		const data = JSON.parse(data);
		return new Promise(resolve => {
			this.callApi('drive/v3/files/' + data.id + '?spaces=appDataFolder&alt=media', '', 'GET').then(resolve);
		});
	},
	delete(filename, data) {
		const data = JSON.parse(data);
		return new Promise(resolve => {
			this.callApi('drive/v3/files/' + data.id + '?spaces=appDataFolder', '', 'DELETE').then(resolve);
		});
	}
};