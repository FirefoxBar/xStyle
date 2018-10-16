# xStyle

[![Build Status](https://travis-ci.org/FirefoxBar/xStyle.svg?branch=master)](https://travis-ci.org/FirefoxBar/xStyle)
[![GitHub release](https://img.shields.io/github/release/FirefoxBar/xStyle.svg)](https://github.com/FirefoxBar/xStyle/releases)
[![license](https://img.shields.io/github/license/FirefoxBar/xStyle.svg)](https://github.com/FirefoxBar/xStyle/blob/master/COPYING)
[![Mozilla Add-on](https://img.shields.io/amo/users/xstyle.svg)](https://addons.mozilla.org/en-US/firefox/addon/xstyle/)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/users/hncgkmhphmncjohllpoleelnibpmccpj.svg)](https://chrome.google.com/webstore/detail/header-editor/hncgkmhphmncjohllpoleelnibpmccpj)

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

Contribute codes: [submiting a pull request](https://github.com/FirefoxBar/xStyle/compare)

Translate this extension: [transifex](https://www.transifex.com/sytec/xstyle/)

Thanks to the following personnel for their contribution:

[8qwe24657913](https://github.com/8qwe24657913) [linusyu](https://github.com/linusyu) [YFdyh000](https://github.com/yfdyh000)

#### Language maintainers

The following are language maintainers, Thanks for their contribution.

If you have any advice on translations, please contact the maintainer(s) directly.

* en: [ShuangYa](https://github.com/sylingd)

* zh-CN: [ShuangYa](https://github.com/sylingd)

* zh-TW: [shyangs](https://github.com/shyangs), [zhtw2013(current)](https://github.com/zhtw2013)

* sv-SE: [Kim](https://github.com/JumpySWE "JumpySWE")

* pt-BR: [Kassio Cruz](https://www.transifex.com/user/profile/kassiocs/)

* ru: [Shychara](https://github.com/vanja-san "Shychara")

* de: [Stone Crusher](https://github.com/stonecrusher "Stone Crusher")

* fr(incomplete): [mikhoul](https://github.com/mikhoul "mikhoul")

## How to build

* Install node, npm or yarn. (It is recommended to use yarn, or the build result may be inconsistent with the release version)

* Download source and extract

* Run `yarn` or `npm install`

* Run `yarn build` or `npm run build`

* If you want to enter development mode, please run `yarn watch:dev` or `npm run watch:dev`

## Licenses

| File/Directory | LICENSE | GitHub |
| ----- | ----- | ----- |
| src/assets/material-design-icons | [Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) | [google/material-design-icons](https://github.com/google/material-design-icons) |

**Everything else:**

Copyright © 2005-2014 [Jason Barnabe](https://github.com/JasonBarnabe)

Copyright © 2017-2018 [FirefoxBar Team](http://team.firefoxcn.net)

Open source licensed under [GPLv3](COPYING).
