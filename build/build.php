<?php
define('EXTENSION_DIR', realpath(__DIR__ . '/..'));
require('config.php');
require('CrxBuild.php');
require('XpiBuild.php');
$exclude = ['.git', '.vscode', 'build', 'manifest', '.gitignore', 'README.md', 'manifest.json'];

// init file list
$filelist = ['file' => [], 'dir' => []];
$dh = opendir(EXTENSION_DIR);
while ($f = readdir($dh)) {
	if (in_array($f, $exclude, TRUE)) {
		continue;
	}
	if ($f === '.' || $f === '..') {
		continue;
	}
	if (is_dir(EXTENSION_DIR . '/' . $f)) {
		$filelist['dir'] = [EXTENSION_DIR . '/' . $f, $f];
	}
	if (is_file(EXTENSION_DIR . '/' . $f)) {
		$filelist['file'] = [EXTENSION_DIR . '/' . $f, $f];
	}
}

// Build for firefox
$xpi = new XpiBuild([
	'name' => 'xstyle',
	'output_dir' => __DIR__ . '/output/firefox'
]);
foreach ($filelist['dir'] as $v) {
	$xpi->addDir($v[0], $v[1]);
}
foreach ($filelist['file'] as $v) {
	$xpi->addFile($v[0], $v[1]);
}
$manifest = str_replace('__version__', EXT_VERSION, file_get_contents(EXTENSION_DIR . '/manifest/firefox.json'));
$manifest = str_replace('__appid__', EXT_GECKO_ID, $manifest);
$xpi->addString('manifest.json', $manifest);
$xpi->build();
echo "Build firefox extension finished\n";
$xpi->setApi(AMO_USER, AMO_SECRET);
$hash = $xpi->sign();
echo "Sign firefox extension finished\n";

// Build AMO version
$amo = new XpiBuild([
	'name' => 'xstyle-amo',
	'output_dir' => __DIR__ . '/output/firefox'
]);
foreach ($filelist['dir'] as $v) {
	$amo->addDir($v[0], $v[1]);
}
foreach ($filelist['file'] as $v) {
	$amo->addFile($v[0], $v[1]);
}
// replace version and appid
$manifest = str_replace('__version__', EXT_VERSION, file_get_contents(EXTENSION_DIR . '/manifest/firefox.json'));
$manifest = str_replace('__appid__', EXT_GECKO_AMO_ID, $manifest);
// remove update
$manifest = json_decode($manifest, 1);
unset($manifest['applications']['gecko']['update_url']);
$amo->addString('manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE));
$amo->build();
echo "Build amo extension finished\n";
$amo->setApi(AMO_USER, AMO_SECRET);
$finish = $amo->sign();
echo "Uploaded AMO version\n";

// Build crx
$crx = new CrxBuild([
	'name' => 'xstyle',
	'key_file' => __DIR__ . '/../../xstyle.pem',
	'output_dir' => __DIR__ . '/output/chrome'
]);
foreach ($filelist['dir'] as $v) {
	$crx->addDir($v[0], $v[1]);
}
foreach ($filelist['file'] as $v) {
	$crx->addFile($v[0], $v[1]);
}
$manifest = str_replace('__version__', EXT_VERSION, file_get_contents(EXTENSION_DIR . '/manifest/chrome.json'));
$crx->addString('manifest.json', $manifest);
$crx->build();
echo "Build chrome extension finished\n";

//Add update files
$fx_update = json_decode(file_get_contents('output/update.json'), 1);
if (count($fx_update['addons'][$gecko_id]['updates']) > 2) {
	array_splice($fx_update['addons'][$gecko_id]['updates'], 0, count($fx_update['addons'][$gecko_id]['updates']) - 2);
}
$fx_update['addons'][$gecko_id]['updates'][] = [
	"version" => $version,
	"update_link" => "https://github.com/FirefoxBar/xStyle/releases/download/$version/xstyle-$version-signed.xpi",
	"update_hash" => $hash
];
file_put_contents('output/update.json', json_encode($fx_update));
$cr_update = "<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='dbbjndgnfkbjmciadekfomemdiledmam'>
    <updatecheck codebase='https://github.com/FirefoxBar/xStyle/releases/download/$version/xstyle-$version.crx' version='$version' />
  </app>
</gupdate>";
file_put_contents('output/update.xml', $cr_update);
echo "Created update files\n";