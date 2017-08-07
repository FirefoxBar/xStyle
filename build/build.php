<?php
define('EXTENSION_DIR', realpath(__DIR__ . '/..'));
require('CrxBuild.php');
// Get version from README.md
preg_match('/releases\/tag\/(.*?)\)/', file_get_contents(EXTENSION_DIR . '/README.md'), $matches);
$version = $matches[1];
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
$xpi->sign();
echo "Sign firefox extension finished\n";