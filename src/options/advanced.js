let setting_list = null;

function init() {
	var params = getParams();
	if (!params.id) { // match should be 2 - one for the whole thing, one for the parentheses
		window.location.href = 'manage.html';
		return;
	}
	requestStyle();
	function requestStyle() {
		browser.runtime.sendMessage({method: "getStyles", id: params.id}).then((styles) => {
			if (!styles) { // Chrome is starting up and shows export.html
				requestStyle();
				return;
			}
			var style = styles[0];
			initWithStyle(style);
		});
	}
}

function initWithStyle(style) {
	window.style = style;
	document.querySelector('.style-name').appendChild(document.createTextNode(style.name));
	const items = style.advanced.item;
	for (const k in items) {
		switch (items[k].type) {
			case 'dropdown':
				createDropdown(k, items[k], style.advanced.saved[k] || null);
				break;
			case 'text':
				createText(k, items[k], style.advanced.saved[k] || null);
				break;
			case 'image':
				createImage(k, items[k], style.advanced.saved[k] || null);
				break;
			case 'color':
				createColor(k, items[k], style.advanced.saved[k] || null);
				break;
		}
	}
}

function createDropdown(key, item, val) {
	let n = template.dropdown.cloneNode(true);
	let options = n.querySelector('.options');
	options.name = key;
	n.querySelector('.title').appendChild(document.createTextNode(item.title));
	for (let k in item.option) {
		let m = document.createElement('option');
		m.value = k;
		m.appendChild(document.createTextNode(item.option[k].title));
		options.appendChild(m);
	}
	if (val !== null) {
		options.querySelector('option[value="' + val + '"]').selected = true;
	}
	setting_list.appendChild(n);
}

function createText(key, item, val) {
	let n = template.text.cloneNode(true);
	let input = n.querySelector('input');
	let id = 'advanced-' + key;
	let title = n.querySelector('label');
	input.name = key;
	input.id = id;
	title.setAttribute('for', id);
	title.appendChild(document.createTextNode(item.title));
	if (val !== null) {
		input.value = val;
	}
	if (typeof(componentHandler) !== 'undefined') {
		componentHandler.upgradeElement(n, 'MaterialTextfield');
	}
	setting_list.appendChild(n);
}

function createColor(key, item, val) {
	let n = template.color.cloneNode(true);
	n.querySelector('input').name = key;
	n.querySelector('.title').appendChild(document.createTextNode(item.title));
	if (val !== null) {
		n.querySelector('input').value = val;
	}
	setting_list.appendChild(n);
}

function createImage(key, item, val) {
	let n = template.image.cloneNode(true);
	n.querySelector('.title').appendChild(document.createTextNode(item.title));
	for (let k in item.option) {
		let m = template.image_item.cloneNode(true);
		m.querySelector('input').name = key;
		m.querySelector('input').value = k;
		m.querySelector('.title').appendChild(document.createTextNode(item.option[k].title));
		m.querySelector('.title').setAttribute('title', item.option[k].title);
		m.querySelector('img').src = item.option[k].value;
		n.appendChild(m);
	}
	let user_type = template.image_item.cloneNode(true);
	user_type.querySelector('input').name = key;
	user_type.querySelector('input').value = 'user-url';
	user_type.querySelector('.title').appendChild(document.createTextNode(t('advancedEnterURL')));
	user_type.querySelector('img').src = 'images/input.png';
	user_type.addEventListener('click', (event) => {
		let url = window.prompt(t('advancedEnterURL'), user_type.querySelector('img').src.indexOf('moz-extension') === 0 ? '' : user_type.querySelector('img').src);
		if (url) {
			user_type.querySelector('img').src = url;
		}
		user_type.querySelector('input').checked = true;
		event.preventDefault();
		event.stopPropagation();
	});
	n.appendChild(user_type);
	let file = template.image_item.cloneNode(true);
	file.querySelector('input').name = key;
	file.querySelector('input').value = 'user-upload';
	file.querySelector('.title').appendChild(document.createTextNode(t('advancedSelectFile')));
	file.querySelector('img').src = 'images/file.png';
	file.addEventListener('click', (event) => {
		var fileInput = document.createElement('input');
		fileInput.style = "display: none;";
		fileInput.type = "file";
		fileInput.accept = '.jpg,.png,.gif,.webp';
		fileInput.acceptCharset = "utf8";
		document.body.appendChild(fileInput);
		fileInput.initialValue = fileInput.value;
		fileInput.addEventListener('change', function(){
			if (fileInput.value != fileInput.initialValue){
				var filename = fileInput.files[0].name;
				var fReader = new FileReader();
				fReader.readAsDataURL(fileInput.files[0]);
				fReader.onloadend = (event) => {
					fileInput.remove();
					file.querySelector('input').checked = true;
					file.querySelector('img').src = event.target.result;
				}
			}
		});
		fileInput.click();
		event.preventDefault();
		event.stopPropagation();
	});
	n.appendChild(file);
	if (val !== null) {
		if (val.indexOf('data:image/') === 0) {
			file.querySelector('input').checked = true;
			file.querySelector('img').src = val;
		} else if (typeof(item.option[val]) === 'undefined') {
			user_type.querySelector('input').checked = true;
			user_type.querySelector('img').src = val;
		} else {
			n.querySelector('input[value="' + val + '"]').checked = true;
		}
	}
	setting_list.appendChild(n);
}

function readAdvanced() {
	let result = {};
	setting_list.querySelectorAll('input[type="text"]').forEach((e) => {
		result[e.name] = e.value;
	});
	setting_list.querySelectorAll('input[type="color"]').forEach((e) => {
		result[e.name] = e.value;
	});
	setting_list.querySelectorAll('option:checked').forEach((e) => {
		result[e.parentElement.name] = e.value;
	});
	setting_list.querySelectorAll('input[type="radio"]:checked').forEach((e) => {
		if (e.value === 'user-upload') {
			result[e.name] = e.parentElement.parentElement.querySelector('img').src;
		} else if (e.value === 'user-url') {
			result[e.name] = e.parentElement.parentElement.querySelector('img').src;
		} else {
			result[e.name] = e.value;
		}
	});
	return result;
}

function onSaveClick() {
	let settings = readAdvanced();
	let style = window.style;
	style.advanced.saved = settings;
	style.method = "saveStyle";
	let code = applyAdvanced(style.code, style.advanced.item, style.advanced.saved);
	CompileDynamic(style.type, code)
	.then(CompileCSS)
	.then((r) => {
		style.sections = r;
		browser.runtime.sendMessage(style).then(() => {
			showToast(t('saveComplete'));
		});
	});
}

function showToast(message) {
	document.getElementById('toast').MaterialSnackbar.showSnackbar({"message": message});
}

document.addEventListener("DOMContentLoaded", () => {
	setting_list = document.getElementById('setting-list');
	init();
	document.getElementById('save').addEventListener('click', onSaveClick);
	document.getElementById('nav-save').addEventListener('click', onSaveClick);
});