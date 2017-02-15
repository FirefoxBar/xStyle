var XSTYLE_DUMP_FILE_EXT     = ".txt";
var XSTYLE_DEFAULT_SAVE_NAME = "xstyle-mm-dd-yyy" + XSTYLE_DUMP_FILE_EXT;
var FIREFOX_VERSION = 0;
if (/Firefox\/(\d+)\.(\d+)/.test(navigator.userAgent)) {
	FIREFOX_VERSION = navigator.userAgent.match(/Firefox\/(\d+)\.(\d+)/);
	FIREFOX_VERSION = parseFloat(FIREFOX_VERSION[1] + '.' + FIREFOX_VERSION[2]);
}

function saveAsFile(text, fileName, dialog) {
    fileName = fileName || XSTYLE_DEFAULT_SAVE_NAME;
    dialog = typeof dialog === "boolean" ? dialog : true;

    return new Promise(function(resolve){
        var fileContent = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
		var blob = new Blob([text]);
		var fileUrl = URL.createObjectURL(blob);
		var option = {filename: fileName, url: fileUrl};
		// Firefox supported saveAs since version 52
		if (FIREFOX_VERSION >= 52) {
			option.saveAs = true;
		}
        browser.downloads.download().then(resolve);
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
                var fReader = new FileReader();
                fReader.readAsText(fileInput.files[0]);
                fReader.onloadend = function(event){
                    fileInput.removeEventListener('change', changeHandler);
                    fileInput.remove();
                    resolve(event.target.result);
                }
            }
        }
        fileInput.click();
    });
}