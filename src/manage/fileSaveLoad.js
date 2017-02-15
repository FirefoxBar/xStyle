var XSTYLE_DUMPFILE_EXTENSION = ".json";

var saveButton = document.getElementById("file-all-styles"),
    loadButton = document.getElementById("unfile-all-styles");

saveButton.addEventListener('click', onSaveToFileClick);
loadButton.addEventListener('click', onLoadFromFileClick);

function onSaveToFileClick(){
    getStyles({}, function(styles){
        var text = JSON.stringify(styles);
        saveAsFile(text, generateFileName());
    });
}

function onLoadFromFileClick(){
    loadFromFile(XSTYLE_DUMPFILE_EXTENSION).then(function(rawText){
        var json = JSON.parse(rawText);

        var i = 0, nextStyle;

        function proceed(){
            nextStyle = json[i++];
            if (nextStyle) {
                saveStyle(nextStyle, proceed);
            }else{
                i--;
                done();
            }
        }

        function done(){
            alert(i + " styles installed/updated");
            location.reload();
        }

        proceed();
    });
}

function generateFileName(){
    return "xstyle-" + moment().format("MM-DD-YYYY") + XSTYLE_DUMPFILE_EXTENSION;
}
