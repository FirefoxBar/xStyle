const fs = require('fs');
const AdmZip = require('adm-zip');
const uglify = require('uglify-es');
const cleancss = require('clean-css');
const ChromeExt = require("crx");
const FirefoxExt = require('sign-addon').default;

const config = require('./config.json');
const CleanCSSOptions = require('./clean_css_config.json');

const buildDir = __dirname.replace(/\\/g, '/');
const rootDir = buildDir.substr(0, buildDir.lastIndexOf('/'));

const outputDir = buildDir + '/output/';
const BaseOutput = outputDir + 'base.zip';
const FirefoxOutput = outputDir + 'Firefox/';
const ChromeOutput = outputDir + 'Chrome/';

const ChromeManifest = require(rootDir + '/manifest/chrome.json');
const FirefoxManifest = require(rootDir + '/manifest/chrome.json');

const ignores = ['.git', '.vscode', 'build', 'manifest', '.gitignore', 'README.md', 'LICENSE', 'manifest.json', 'manifest_t.json'];

function getFileExt(name) {
	return name.includes('.') ? name.substr(name.lastIndexOf('.') + 1) : '';
}
function deepCopy(obj) {
	if (!obj || typeof obj != "object") {
		return obj;
	} else {
		var emptyCopy = Object.create(Object.getPrototypeOf(obj));
		return deepMerge(emptyCopy, obj);
	}
}
function deepMerge(target, obj1 /* plus any number of object arguments */) {
	for (var i = 1; i < arguments.length; i++) {
		var obj = arguments[i];
		for (var k in obj) {
			// hasOwnProperty checking is not needed for our non-OOP stuff
			var value = obj[k];
			if (!value || typeof value != "object") {
				target[k] = value;
			} else if (k in target) {
				deepMerge(target[k], value);
			} else {
				target[k] = deepCopy(value);
			}
		}
	}
	return target;
}
function readDir(dir) {
	return new Promise((resolve) => {
		let readCount = 0;
		let fileList = [];
		fs.readdir(dir, (err, files) => {
			if (err) {
				console.log(err);
				return;
			}
			files.forEach((filename) => {
				if (ignores.includes(filename)) {
					return;
				}
				if (fs.statSync(dir + '/' + filename).isFile()) {
					fileList.push({
						"name": filename,
						"path": dir.substr(rootDir.length) + '/' + filename,
						"fullpath": dir + '/' + filename
					});
				} else {
					readCount++;
					readDir(dir + '/' + filename).then((subFileList) => {
						readCount--;
						fileList = fileList.concat(subFileList);
						checkReadFinish();
					});
				}
			});
			checkReadFinish();
		});
		function checkReadFinish() {
			if (isReadFinish()) {
				resolve(fileList);
			}
		}
		function isReadFinish() {
			return readCount === 0;
		}
	});
}

function createZip(output, fileList) {
	return new Promise((resolve) => {
		let f_output = fs.createWriteStream(output);
		let archive = new AdmZip();
		archive.compressing = 0;
		fileList.forEach((f) => {
			if (!f.fullpath.includes('third-party') && getFileExt(f.fullpath) === 'js') {
				archive.compressing++;
				fs.readFile(f.fullpath, {flag: 'r', encoding: 'utf-8'}, function (err, data) {
					archive.addFile(
						f.path,
						new Buffer(uglify.minify(data, { compress: true, mangle: true}).code)
					);
					archive.compressing--;
					checkFinish();
				});
			} else if (!f.fullpath.includes('third-party') && getFileExt(f.fullpath) === 'css') {
				archive.compressing++;
				fs.readFile(f.fullpath, {flag: 'r', encoding: 'utf-8'}, function (err, data) {
					archive.addFile(
						f.path,
						new Buffer(new cleancss(CleanCSSOptions).minify(data).styles)
					);
					archive.compressing--;
					checkFinish();
				});
			} else {
				archive.addLocalFile(f.fullpath, f.path);
			}
		});
		checkFinish();
		function checkFinish() {
			console.log(archive.compressing);
			if (archive.compressing === 0) {
				archive.writeZip(output);
				resolve();
			}
		}
	});
}
readDir(rootDir).then((fileList) => {
	createZip(BaseOutput, fileList).then(() => {
		// Build chrome extension
		let crx_default_zip = new AdmZip(BaseOutput);
		let crx_default_manifest = deepCopy(FirefoxManifest);
		crx_default_manifest.version = config.ext.version;
		crx_default_manifest.update_url = config.ext.crx.update;
		crx_default_manifest.addFile('manifest.json', new Buffer(JSON.stringify(xpi_amo_manifest)));
		crx_default_zip.writeZip(ChromeOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.zip');
		const crx_default = new ChromeExt({
			codebase: config.ext.crx.download_url.replace(/\{VERSION\}/g, config.ext.version),
			privateKey: fs.readFileSync(rootDir + '/' + config.ext.crx.key)
		});
		crx_default.load(ChromeOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.zip')
		.then(crx => crx.pack())
		.then(crxBuffer => {
			const updateXML = crx.generateUpdateXML()
			fs.writeFile(outputDir + 'update.xml', updateXML);
			fs.writeFile(ChromeOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.crx', crxBuffer);
		});
		console.log('Build chrome version finished');
		// Build chrome webstore format
		let crx_store_zip = new AdmZip(BaseOutput);
		let crx_storet_manifest = deepCopy(FirefoxManifest);
		crx_store_manifest.version = config.ext.version;
		crx_store_manifest.update_url = config.ext.crx.update;
		crx_store_manifest.addFile('manifest.json', new Buffer(JSON.stringify(xpi_amo_manifest)));
		crx_store_zip.writeZip(outputDir + 'chrome.zip');
		console.log('Build chrome webstore version finished');
		// Build default firefox extension
		const xpi_default_path = FirefoxOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.xpi';
		let xpi_default = new AdmZip(BaseOutput);
		let xpi_default_manifest = deepCopy(FirefoxManifest);
		xpi_default_manifest.version = config.ext.version;
		xpi_default_manifest.applications.gecko.id = config.ext.gecko.default;
		xpi_default_manifest.applications.gecko.update_url = config.ext.gecko.update;
		xpi_default_manifest.addFile('manifest.json', new Buffer(JSON.stringify(xpi_default_manifest)));
		xpi_default.writeZip(xpi_default_path);
		console.log('Build firefox version finished');
		// Sign
		FirefoxExt({
			xpiPath: xpi_default_path,
			version: config.ext.version,
			apiKey: config.amo.user,
			apiSecret: config.amo.secret,
			downloadDir: FirefoxOutput
		}).then(function(result) {
			if (result.success) {
				console.log("The following signed files were downloaded:");
				console.log(result.downloadedFiles);
				console.log("Your extension ID is:");
				console.log(result.id);
			} else {
				console.error("Your add-on could not be signed!");
				console.error("Check the console for details.");
			}
			console.log(result.success ? "SUCCESS" : "FAIL");
		})
		.catch(function(error) {
			console.error("Signing error:", error);
		});
		// Build amo firefox extension
		let xpi_amo = new AdmZip(BaseOutput);
		let xpi_amo_manifest = deepCopy(FirefoxManifest);
		xpi_amo_manifest.version = config.ext.version;
		xpi_amo_manifest.applications.gecko.id = config.ext.gecko.default;
		xpi_amo_manifest.addFile('manifest.json', new Buffer(JSON.stringify(xpi_amo_manifest)));
		xpi_amo.writeZip(FirefoxOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '-amo.xpi');
		console.log('Build firefox version finished');
	});
});