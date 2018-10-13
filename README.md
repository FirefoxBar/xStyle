# xStyle

[![GitHub release](https://img.shields.io/github/release/FirefoxBar/xStyle.svg)](https://github.com/FirefoxBar/xStyle/releases)
[![license](https://img.shields.io/github/license/FirefoxBar/xStyle.svg)](https://github.com/FirefoxBar/xStyle/blob/master/COPYING)

A style manager for your browser. Built on the WebExtensions APIs.

You can get this extension from [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/xstyle/) and [Chrome Webstore](https://chrome.google.com/webstore/detail/xstyle/hncgkmhphmncjohllpoleelnibpmccpj).

But if you want to stay up-to-date with the latest developments, you should [install our self-distributed version](https://github.com/FirefoxBar/xStyle/releases).

For more documentation, please visit the [wiki](https://github.com/FirefoxBar/xStyle/wiki).

## Compatibility

![Firefox Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/firefox/firefox_16x16.png) Mozilla Firefox 49+

![Chrome Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/chrome/chrome_16x16.png) Google Chrome

## Install self-distributed version in Chrome

You should download an [Administrative Policy Template](http://www.chromium.org/administrators/policy-templates) and install it.

Then, allow Chrome to install local plugins and whitelist the ID for this extension (`dbbjndgnfkbjmciadekfomemdiledmam`).

For more information, see [kafan](http://bbs.kafan.cn/thread-1689765-1-1.html) and [tieba](http://tieba.baidu.com/p/3091171066).

## Contribution

You can contribute code by [submiting a pull request](https://github.com/FirefoxBar/xStyle/compare).

You can also help us translate this extension on [Transifex](https://www.transifex.com/sytec/xstyle/).

## How to build

* Download [WebExt-build-tool](https://github.com/FirefoxBar/WebExt-build-tool) and configure it

* The config of xStyle is like this:

```javascript
"xstyle": {
	"basic": {
		"dir": "X:/Code/xStyle",
		"output": "{EXT_DIR}/build/output",
		"ignores": [".git", ".vscode", "build", "manifest", ".gitignore", "README.md", "LICENSE", "manifest.json", "manifest_t.json"],
		"custom": "{EXT_DIR}/build/custom.js",
		"version": {
			"firefox": 0,
			"amo": 0,
			"chrome": 0,
			"webstore": 1
		}
	},
	"locales": {
		"dir": "{EXT_DIR}/_locales",
		"type": "transifex",
		"placeholder": "{EXT_DIR}/build/locales_placeholder.json",
		"default": "en",
		"languages": ["zh_CN", "zh_TW", "pt_BR"],
		"editable": "{EXT_DIR}/build/editable.json"
	},
	"ext": {
		"version": "3.0.5",
		"filename": "xstyle-{VERSION}",
		"gecko": {
			"manifest": "{EXT_DIR}/manifest/firefox.json",
			// Omit some information
		},
		"crx": {
			"manifest": "{EXT_DIR}/manifest/chrome.json"
		}
	}
	// Omit some information
}
```

* Run `node build.js xstyle`

## Translators

* en: [ShuangYa](https://github.com/sylingd)

* zh-CN: [ShuangYa](https://github.com/sylingd)

* zh-TW: [shyangs](https://github.com/shyangs), [zhtw2013](https://github.com/zhtw2013)

* sv-SE: [Kim](https://github.com/JumpySWE "JumpySWE")

* pt-BR: [Kassio Cruz](https://www.transifex.com/user/profile/kassiocs/)

* ru: [Shychara](https://github.com/vanja-san "Shychara")

* de: [Stone Crusher](https://github.com/stonecrusher "Stone Crusher")

* fr(incomplete): [mikhoul](https://github.com/mikhoul "mikhoul")

## Licenses

| File/Directory | Version | LICENSE | GitHub |
| ----- | ----- | ----- | ----- |
| scripts/page/popup/mustache.min.js | 2.3.0 | [MIT](https://github.com/janl/mustache.js/blob/master/LICENSE) | [janl/mustache.js](https://github.com/janl/mustache.js) |
| scripts/md5.min.js | 2.8.0 | [MIT](https://github.com/blueimp/JavaScript-MD5/blob/master/LICENSE.txt) | [blueimp/JavaScript-MD5](https://github.com/blueimp/JavaScript-MD5) |
| third-party/codemirror | 5.28.0 | [MIT](third-party/codemirror/LICENSE) | [codemirror/CodeMirror](https://github.com/codemirror/CodeMirror) |
| scripts/browser-polyfill.js | - | [MPL 2.0](http://mozilla.org/MPL/2.0/) | [mozilla/webextension-polyfill](https://github.com/mozilla/webextension-polyfill) |
| third-party/colorpicker | 1.7.6 | [MIT](https://github.com/easylogic/codemirror-colorpicker/blob/master/LICENSE) | [easylogic/codemirror-colorpicker](https://github.com/easylogic/codemirror-colorpicker) |
| third-party/mdl | 1.3.0 | [Apache 2.0](https://github.com/google/material-design-lite/blob/mdl-1.x/LICENSE) | [google/material-design-lite](https://github.com/google/material-design-lite) |
| third-party/material-design-icons | 3.0.1 | [Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) | [google/material-design-icons](https://github.com/google/material-design-icons) |
| third-party/beautify | 1.7.4 | [MIT](https://github.com/beautify-web/js-beautify/blob/master/LICENSE) | [beautify-web/js-beautify](https://github.com/beautify-web/js-beautify) |
| third-party/clean-css | 4.1.9 | [MIT](https://github.com/jakubpawlowicz/clean-css/blob/master/LICENSE) | [jakubpawlowicz/clean-css](https://github.com/jakubpawlowicz/clean-css) |
| third-party/less | 2.7.3 | [Apache 2.0](https://github.com/less/less.js/blob/master/LICENSE) | [less/less.js](https://github.com/less/less.js) |
| third-party/stylelint | 8.2.0 | [MIT](https://github.com/stylelint/stylelint/blob/master/LICENSE) | [stylelint/stylelint](https://github.com/stylelint/stylelint) |

**Everything else:**

Copyright © 2005-2014 [Jason Barnabe](https://github.com/JasonBarnabe)

Copyright © 2017-2018 [FirefoxBar Team](http://team.firefoxcn.net)

Open source licensed under [GPLv3](COPYING).
