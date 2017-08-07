<?php
define('EXTENSION_DIR', realpath(__DIR__ . '/..'));
require('config.php');
require('CrxBuild.php');
require('XpiBuild.php');
// Get version from README.md
preg_match('/releases\/tag\/(.*?)\)/', file_get_contents(EXTENSION_DIR . '/README.md'), $matches);
$version = $matches[1];
// Get firefox addon ID from manifest
$manifest = json_decode(file_get_contents(EXTENSION_DIR . '/manifest/firefox.json'), 1);
$gecko_id = $manifest['applications']['gecko']['id'];
$exclude = ['.git', '.vscode', 'build', 'manifest', '.gitignore', 'README.md', 'manifest.json'];
$crx = new CrxBuild([
	'name' => 'xstyle',
	'key_file' => __DIR__ . '/../../xstyle.pem',
	'output_dir' => __DIR__ . '/output/chrome'
]);
$xpi = new XpiBuild([
	'name' => 'xstyle',
	'output_dir' => __DIR__ . '/output/firefox'
]);
$dh = opendir(EXTENSION_DIR);
while ($f = readdir($dh)) {
	if (in_array($f, $exclude, TRUE)) {
		continue;
	}
	if ($f === '.' || $f === '..') {
		continue;
	}
	if (is_dir(EXTENSION_DIR . '/' . $f)) {
		$crx->addDir(EXTENSION_DIR . '/' . $f, $f);
		$xpi->addDir(EXTENSION_DIR . '/' . $f, $f);
	}
	if (is_file(EXTENSION_DIR . '/' . $f)) {
		$crx->addFile(EXTENSION_DIR . '/' . $f, $f);
		$xpi->addFile(EXTENSION_DIR . '/' . $f, $f);
	}
}
$manifest = str_replace('__version__', $version, file_get_contents(EXTENSION_DIR . '/manifest/chrome.json'));
$crx->addString('manifest.json', $manifest);
$manifest = str_replace('__version__', $version, file_get_contents(EXTENSION_DIR . '/manifest/firefox.json'));
$xpi->addString('manifest.json', $manifest);
$crx->build();
echo "Build chrome extension finished\n";
$xpi->build();
echo "Build firefox extension finished\n";
$xpi->setApi(AMO_USER, AMO_SECRET);
$hash = $xpi->sign();
echo "Sign firefox extension finished\n";
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