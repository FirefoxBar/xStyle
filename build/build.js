const fs = require('fs');
const AdmZip = require('adm-zip');
const uglify = require('uglify-es');
const cleancss = require('clean-css');
const FirefoxExt = require('sign-addon').default;
const crypto = require('crypto');
const deepCopy = require('./deepCopy.js');

const config = require('./config.json');
const CleanCSSOptions = require('./clean_css_config.json');

const buildDir = __dirname.replace(/\\/g, '/');
const rootDir = buildDir.substr(0, buildDir.lastIndexOf('/'));

// const outputDir = buildDir + '/output/';
const outputDir = 'Z:/';
const BaseOutput = outputDir + 'base.zip';
const FirefoxOutput = outputDir + 'Firefox/';
const ChromeOutput = outputDir + 'Chrome/';

const ChromeManifest = require(rootDir + '/manifest/chrome.json');
const FirefoxManifest = require(rootDir + '/manifest/firefox.json');

const ignores = ['.git', '.vscode', 'build', 'manifest', '.gitignore', 'README.md', 'LICENSE', 'manifest.json', 'manifest_t.json'];

function getFileExt(name) {
	return name.includes('.') ? name.substr(name.lastIndexOf('.') + 1) : '';
}
function createCrx(fileContent, publicKey) {
	return new Promise((resolve) => {
		var keyLength = publicKey.length;
		var signature = new Buffer(
			crypto
			.createSign("sha1")
			.update(fileContent)
			.sign(publicKey),
			"binary"
		);
		var sigLength = signature.length;
		var zipLength = fileContent.length;
		var length = 16 + keyLength + sigLength + zipLength;
		var crx = new Buffer(length);
		crx.write("Cr24" + new Array(13).join("\x00"), "binary");
		crx[4] = 2;
		crx.writeUInt32LE(keyLength, 8);
		crx.writeUInt32LE(sigLength, 12);
		publicKey.copy(crx, 16);
		signature.copy(crx, 16 + keyLength);
		fileContent.copy(crx, 16 + keyLength + sigLength);
		resolve(crx);
	});
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
		fileList.forEach((f) => {
			if (!f.fullpath.includes('.min.js') && getFileExt(f.fullpath) === 'js') {
				archive.addFile(
					f.path,
					new Buffer(
						uglify.minify(
							fs.readFileSync(f.fullpath, 'utf-8'),
							{ compress: true, mangle: true}
						).code
					)
				);
			} else if (!f.fullpath.includes('.min.css') && getFileExt(f.fullpath) === 'css') {
				archive.addFile(
					f.path,
					new Buffer(
						new cleancss(CleanCSSOptions).minify(fs.readFileSync(f.fullpath, 'utf-8')).styles
					)
				);
			} else {
				archive.addFile(f.path, fs.readFileSync(f.fullpath));
			}
			console.log('Added ' + f.path);
		});
		archive.writeZip(output);
		resolve();
	});
}
readDir(rootDir).then((fileList) => {
	console.log('Scanned all files');
	createZip(BaseOutput, fileList).then(() => {
		console.log('Created base zip file');
		// Build chrome extension
		const crx_default_zip_out = ChromeOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.zip';
		const crx_default_crx_out = ChromeOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.crx';
		let crx_default_zip = new AdmZip(BaseOutput);
		let crx_default_manifest = deepCopy(ChromeManifest);
		crx_default_manifest.version = config.ext.version;
		crx_default_manifest.update_url = config.ext.crx.update;
		crx_default_zip.addFile('manifest.json', new Buffer(JSON.stringify(crx_default_manifest)));
		crx_default_zip.writeZip(crx_default_zip_out);
		createCrx(fs.readFileSync(crx_default_zip_out), fs.readFileSync(rootDir + '/' + config.ext.crx.key))
		.then((crxBuffer) => {
			fs.writeFile(crx_default_crx_out, crxBuffer);
			console.log('Build chrome crx version finished');
		});
		console.log('Build chrome version finished');
		// Build chrome webstore format
		let crx_store_zip = new AdmZip(BaseOutput);
		let crx_store_manifest = deepCopy(ChromeManifest);
		crx_store_manifest.version = config.ext.version;
		crx_store_manifest.update_url = config.ext.crx.update;
		crx_store_zip.addFile('manifest.json', new Buffer(JSON.stringify(crx_store_manifest)));
		crx_store_zip.writeZip(outputDir + 'chrome.zip');
		console.log('Build chrome webstore version finished');
		// Build default firefox extension
		const xpi_default_path = FirefoxOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '.xpi';
		let xpi_default = new AdmZip(BaseOutput);
		let xpi_default_manifest = deepCopy(FirefoxManifest);
		xpi_default_manifest.version = config.ext.version;
		xpi_default_manifest.applications.gecko.id = config.ext.gecko.default;
		xpi_default_manifest.applications.gecko.update_url = config.ext.gecko.update;
		xpi_default.addFile('manifest.json', new Buffer(JSON.stringify(xpi_default_manifest)));
		xpi_default.writeZip(xpi_default_path);
		console.log('Build firefox version finished');
		// Sign
		// FirefoxExt({
		// 	xpiPath: xpi_default_path,
		// 	version: config.ext.version,
		// 	apiKey: config.amo.user,
		// 	apiSecret: config.amo.secret,
		// 	downloadDir: FirefoxOutput
		// }).then(function(result) {
		// 	if (result.success) {
		// 		console.log("The following signed files were downloaded:");
		// 		console.log(result.downloadedFiles);
		// 		console.log("Your extension ID is:");
		// 		console.log(result.id);
		// 	} else {
		// 		console.error("Your add-on could not be signed!");
		// 		console.error("Check the console for details.");
		// 	}
		// 	console.log(result.success ? "SUCCESS" : "FAIL");
		// })
		// .catch(function(error) {
		// 	console.error("Signing error:", error);
		// });
		// Build amo firefox extension
		let xpi_amo = new AdmZip(BaseOutput);
		let xpi_amo_manifest = deepCopy(FirefoxManifest);
		xpi_amo_manifest.version = config.ext.version;
		xpi_amo_manifest.applications.gecko.id = config.ext.gecko.default;
		xpi_amo.addFile('manifest.json', new Buffer(JSON.stringify(xpi_amo_manifest)));
		xpi_amo.writeZip(FirefoxOutput + config.ext.filename.replace(/\{VERSION\}/g, config.ext.version) + '-amo.xpi');
		console.log('Build firefox version finished');
	});
});