export default {
	"client_id": 'd742c0ec-f3ba-4ce9-949a-56507e86ca98',
	"scope": ['openid', 'offline_access', 'files.readwrite', 'files.readwrite.appfolder'],
	"api_url": 'https://graph.microsoft.com/v1.0/me/',
	getLoginUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=' + this.client_id + '&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&response_mode=query&scope=' + this.scope.join(' ') + '&state=xstyle';
	},
	loginCallback(code) {
		return new Promise(resolve => {
			fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
				method: "POST",
				body: 'client_id=' + this.client_id + '&scope=' + this.scope.join(' ') + '&code=' + code + '&redirect_uri=' + encodeURIComponent('https://login.microsoftonline.com/common/oauth2/nativeclient') + '&grant_type=authorization_code',
				headers: new Headers({
					"Content-type": "application/x-www-form-urlencoded"
				})
			})
			.then(res => {
				if (res.ok) {
					const user_info = res.json();
					user_info.expires_at = new Date().getTime() + (user_info.expires_in * 1000);
					if (localStorage) {
						localStorage.setItem('OneDrive', JSON.stringify(user_info));
					}
					this.initFolder().then(resolve);
				} else {
					console.log(res.status);
					resolve(null);
				}
			})
			.catch(e => {
				console.log(e);
				resolve(null);
			})
		});
	},
	getUser() {
		return new Promise((resolve) => {
			if (!localStorage || !localStorage.getItem('OneDrive')) {
				resolve(null);
			}
			const user_info = JSON.parse(localStorage.getItem('OneDrive'));
			if (user_info === null) {
				resolve(null);
			}
			if (user_info.expires_at <= new Date().getTime()) {
				//reload the token
				fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
					method: "POST",
					body: 'client_id=' + this.client_id + '&scope=' + this.scope.join(' ') + '&refresh_token=' + user_info.refresh_token + '&redirect_uri=' + encodeURIComponent('https://login.microsoftonline.com/common/oauth2/nativeclient') + '&grant_type=refresh_token',
					headers: new Headers({
						"Content-type": "application/x-www-form-urlencoded"
					})
				})
				.then(res => {
					if (res.ok) {
						const uinfo = res.json();
						uinfo.expires_at = new Date().getTime() + (uinfo.expires_in * 1000);
						if (localStorage) {
							localStorage.setItem('OneDrive', JSON.stringify(uinfo));
						}
						resolve(uinfo);
					} else {
						console.log(res.status);
						resolve(null);
					}
				})
				.catch(e => {
					console.log(e);
					resolve(null);
				})
			} else {
				resolve(user_info);
			}
		});
	},
	initFolder() {
		return new Promise(resolve => {
			this.callApi('drive/special/approot/children')
			.then(result => {
				let init = true;
				for (let f of result.value) {
					if (f.name === 'xstyle') {
						init = false;
						break;
					}
				}
				if (init) {
					this.callApi('drive/special/approot/children', {
						"name": "xstyle",
						"folder": {}
					}, 'POST')
					.then(resolve);
				} else {
					resolve();
				}
			});
		});
	},
	callApi(apiUrl, apiData, apiMethod) {
		if (!apiMethod) {
			apiMethod = 'GET';
		}
		return new Promise(resolve => {
			this.getUser().then(user => {
				if (!user) {
					resolve(null);
				}
				const data = {
					method: apiMethod,
					headers: new Headers({
						"Content-type": "application/json",
						"Authorization": "Bearer " + user.access_token
					})
				};
				if (apiData) {
					data.body = typeof(apiData) === 'object' ? JSON.stringify(apiData) : apiData;
				}
				fetch(this.api_url + apiUrl, data)
				.then(res => {
					if (res.ok) {
						try {
							resolve(res.json());
						} catch (e) {
							resolve(res.text());
						}
					} else {
						console.log(res.status);
						resolve(null);
					}
				})
				.catch(e => {
					console.log(e);
					resolve(null);
				})
			});
		});
	},
	uploadFile(filename, content) {
		return new Promise(resolve => {
			this.callApi('drive/special/approot:/xstyle/' + filename + ':/content', content, 'PUT')
			.then(resolve);
		});
	},
	getFileList() {
		return new Promise(resolve => {
			this.callApi('drive/special/approot:/xstyle:/children')
			.then(result => {
				const ret = [];
				for (const f of result.value) {
					ret.push({
						"name": f.name,
						"size": f.size
					});
				}
				resolve(ret);
			});
		});
	},
	getFile(filename) {
		return new Promise(resolve => {
			this.callApi('drive/special/approot:/xstyle/' + filename + ':/content', '', 'GET')
			.then(resolve);
		});
	},
	delete(filename) {
		return new Promise(resolve => {
			this.callApi('drive/special/approot:/xstyle/' + filename + ':/', '', 'DELETE')
			.then(resolve);
		});
	}
};