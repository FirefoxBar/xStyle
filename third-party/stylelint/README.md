This is a modified version of stylelint for use in browsers, based on version 8.2.0

The modified method basically follows the [Mottie's method](https://github.com/Mottie/stylelint/tree/mod)

It is as follows:

* Remove all test files (include `__tests__` directories and `testUtils`directory)
* Remove depends of testUtils (by search)
* Remove autoprefixer, include following rules:
	* at-rule-no-vendor-prefix
	* media-feature-name-no-vendor-prefix
	* property-no-vendor-prefix
	* selector-no-vendor-prefix
	* value-no-vendor-prefix
* Remove all references to node's fs

How to build it:

* Download the stylelint release and unzip it to a directory
* Run `npm install`
* Remove or modify some files
* Move all stylelint's files to `node_modules/stylelint`
* Run `browserify -r stylelint -o stylelint-bundle.js`
* Install [uglify-es](https://github.com/mishoo/UglifyJS2/tree/harmony)
* Run `uglifyjs ./stylelint-bundle.js -o stylelint-bundle.min.js -c -m`