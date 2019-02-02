# xStyle

[![Build Status](
https://img.shields.io/travis/FirefoxBar/xStyle/master.svg?style=flat-square)](https://travis-ci.org/FirefoxBar/xStyle)
[![GitHub release](https://img.shields.io/github/release/FirefoxBar/xStyle.svg?style=flat-square)](https://github.com/FirefoxBar/xStyle/releases)
[![license](https://img.shields.io/github/license/FirefoxBar/xStyle.svg?style=flat-square)](https://github.com/FirefoxBar/xStyle/blob/master/COPYING)
[![Gitter](https://img.shields.io/gitter/room/FirefoxBar/xStyle.svg?style=flat-square)](https://gitter.im/FirefoxBar/xStyle)
[![Mozilla Add-on](https://img.shields.io/amo/users/xstyle.svg)]()
[![Chrome Web Store](https://img.shields.io/chrome-web-store/users/hncgkmhphmncjohllpoleelnibpmccpj.svg)]()

A style manager.

For more documentations, please visit [wiki](https://github.com/FirefoxBar/xStyle/wiki).

## Get this extension

![Firefox Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/firefox/firefox_16x16.png) [Mozilla Add-on](https://addons.mozilla.org/en-US/firefox/addon/xstyle/).

![Chrome Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/chrome/chrome_16x16.png) [Chrome Web Store](https://chrome.google.com/webstore/detail/xstyle/hncgkmhphmncjohllpoleelnibpmccpj).

Install our [self-distributed version](https://github.com/FirefoxBar/xStyle/releases).

#### Install self-distributed version in Chrome

You should download an [Administrative Policy Template](http://www.chromium.org/administrators/policy-templates) and install it.

Then, allow Chrome to install local plugins and whitelist the ID for this extension (`dbbjndgnfkbjmciadekfomemdiledmam`).

For more information, see [kafan](http://bbs.kafan.cn/thread-1689765-1-1.html) and [tieba](http://tieba.baidu.com/p/3091171066).

## Contribution

Contribute codes: [Submiting a pull request](https://github.com/FirefoxBar/xStyle/compare)

Translate this extension: [Transifex](https://www.transifex.com/sytec/xstyle/)

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

#### Prepare

* Install node, npm or yarn. (It is recommended to use yarn, or the build result may be inconsistent with the release version)

* Clone this project, or download the source code and extract it

* Run `yarn` or `npm install`

#### Build

* Run `yarn build` or `npm run build`

* Find build result at `/dist`

#### Development

* Run `yarn watch:dev` or `npm run watch:dev`

* Open browser, load extension from `/dist` directory or `/dist/manifest.json`

## Licenses

Copyright © 2005-2014 [Jason Barnabe](https://github.com/JasonBarnabe)

Copyright © 2017-2019 [FirefoxBar Team](http://team.firefoxcn.net)

Open source licensed under [GPLv3](LICENSE).
