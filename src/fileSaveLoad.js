function saveAsFile(text, fileName, dialog) {
	fileName = fileName || XSTYLE_DEFAULT_SAVE_NAME;

	return new Promise(function(resolve){
		var blob = new Blob([text]);
		var fileUrl = URL.createObjectURL(blob);
		var option = {filename: fileName, url: fileUrl};
		// Firefox supported saveAs since version 52
		if (isChrome || FIREFOX_VERSION >= 52) {
			option.saveAs = true;
		}
		browser.downloads.download(option).then(resolve);
	});
}

/**
 * !!works only when page has representation - backgound page won't work
 *
 * opens open file dialog,
 * gets selected file,
 * gets it's path,
 * gets content of it by ajax
 */
function loadFromFile(formatToFilter){
	return new Promise(function(resolve){
		var fileInput = document.createElement('input');
		fileInput.style = "display: none;";
		fileInput.type = "file";
		fileInput.accept = formatToFilter || XSTYLE_DUMP_FILE_EXT;
		fileInput.acceptCharset = "utf8";

		document.body.appendChild(fileInput);
		fileInput.initialValue = fileInput.value;
		fileInput.addEventListener('change', changeHandler);
		function changeHandler(){
			if (fileInput.value != fileInput.initialValue){
				var filename = fileInput.files[0].name;
				var fReader = new FileReader();
				fReader.readAsText(fileInput.files[0]);
				fReader.onloadend = function(event){
					fileInput.removeEventListener('change', changeHandler);
					fileInput.remove();
					resolve([event.target.result, filename]);
				}
			}
		}
		fileInput.click();
	});
}