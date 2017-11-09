<?php
require('config.php');
define('OUTPUT_DIR', realpath(__DIR__ . '/../_locales') . '/');
$default = 'en';
$language_list = ['zh_CN', 'zh_TW', 'sv_SE', 'ru'];
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
//Download default language
if (!is_dir(OUTPUT_DIR . $default)) {
	mkdir(OUTPUT_DIR . $default);
}
echo "Downloading $default ... ";
$url = 'https://www.transifex.com/api/2/project/xstyle/resource/messages/translation/' . $default . '/';
do {
	$language = json_decode(fetchUrl($url), 1);
} while (empty($language));
$default_content = json_decode($language['content'], 1);
ksort($default_content);
file_put_contents('./output/message.json', str_replace('    ', "\t", json_encode($default_content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));
// Add placeholders
foreach ($placeholders as $kk => $vv) {
	if (isset($default_content[$kk])) {
		$default_content[$kk]['placeholders'] = $vv;
	} else {
		echo "\n$kk not exists, please check it\n";
	}
}
file_put_contents(OUTPUT_DIR . $default . '/messages.json', json_encode($default_content, JSON_UNESCAPED_UNICODE));
echo "ok\n";
//Download other languages
foreach ($language_list as $v) {
	if (!is_dir(OUTPUT_DIR . $v)) {
		mkdir(OUTPUT_DIR . $v);
	}
	echo "Downloading $v ... ";
	$url = 'https://www.transifex.com/api/2/project/xstyle/resource/messages/translation/' . $v . '/';
	do {
		$language = json_decode(fetchUrl($url), 1);
	} while (empty($language));
	$content = json_decode($language['content'], 1);
	ksort($content);
	foreach ($content as $kk => $vv) {
		unset($content[$kk]['description']); // remove description
		if (empty($vv['message'])) {
			$content[$kk]['message'] = $default_content[$kk]['message']; // set english words to it if it is empty
		}
	}
	// Add placeholders
	foreach ($placeholders as $kk => $vv) {
		if (isset($content[$kk])) {
			$content[$kk]['placeholders'] = $vv;
		} else {
			echo "\n$kk not exists, please check it\n";
		}
	}
	file_put_contents(OUTPUT_DIR . $v . '/messages.json', json_encode($content, JSON_UNESCAPED_UNICODE));
	echo "ok\n";
}
echo "All ok\n";