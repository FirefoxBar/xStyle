<?php
require('config.php');
define('OUTPUT_DIR', realpath(__DIR__ . '/../_locales') . '/');
$language_list = ['en', 'zh_CN', 'zh_TW'];
$placeholders = json_decode(file_get_contents('locales_placeholder.json'), 1);
function fetchUrl($url) {
	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_USERPWD, T_USER . ':' . T_TOKEN);
	$r = curl_exec($ch);
	@curl_close($ch);
	return $r;
}
foreach ($language_list as $v) {
	if (!is_dir(OUTPUT_DIR . $v)) {
		mkdir(OUTPUT_DIR . $v);
	}
	echo "Downloading $v ... ";
	do {
		$language = json_decode(fetchUrl('https://www.transifex.com/api/2/project/xstyle/resource/messages/translation/' . $v . '/'), 1);
	} while (empty($language));
	$content = json_decode($language['content'], 1);
	ksort($content);
	// Add placeholders
	foreach ($placeholders as $kk => $vv) {
		$content[$kk]['placeholders'] = $vv;
	}
	file_put_contents(OUTPUT_DIR . $v . '/messages.json', str_replace('    ', "\t", json_encode($content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));
	echo "ok\n";
}
echo "All ok\n";