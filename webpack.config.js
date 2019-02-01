const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const {
	VueLoaderPlugin
} = require('vue-loader');
const {
	version
} = require('./package.json');

const config = {
	mode: process.env.NODE_ENV,
	context: __dirname + '/src',
	entry: {
		'background': './background.js',
		'popup/popup': './popup/popup.js',
		'options/options': './options/options.js',
		'options/edit': './options/edit.js',
		'inject/cloud': './inject/cloud.js',
		'inject/apply': './inject/apply.js',
		'inject/install': './inject/install.js',
		'inject/userstyles.org': './inject/userstyles.org.js',
		'inject/freestyler.ws': './inject/freestyler.ws.js',
	},
	output: {
		path: __dirname + '/dist',
		filename: '[name].js'
	},
	resolve: {
		extensions: ['.js', '.vue'],
	},
	module: {
		rules: [{
				test: /\.vue$/,
				loaders: 'vue-loader',
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.scss$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
			},
			{
				test: /\.sass$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader?indentedSyntax'],
			},
			{
				test: /\.(png|jpg|gif|svg|ico|ttf|eot|woff|woff2)$/,
				loader: 'file-loader',
				options: {
					name: '/assets/[name].[hash].[ext]',
				},
			}
		],
	},
	plugins: [
		new VueLoaderPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new CopyWebpackPlugin([{
				from: 'public',
				to: 'assets'
			},
			{
				from: '_locales',
				to: '_locales'
			},
			{
				from: 'popup/popup.html',
				to: 'popup/popup.html'
			},
			{
				from: 'options/options.html',
				to: 'options/options.html'
			},
			{
				from: 'manifest.json',
				to: 'manifest.json',
				transform: (content) => {
					const jsonContent = JSON.parse(content);
					jsonContent.version = version;

					if (config.mode === 'development') {
						jsonContent['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
					}

					return JSON.stringify(jsonContent);
				},
			},
		]),
		new WebpackShellPlugin({
			onBuildEnd: ['node scripts/remove-evals.js'],
		}),
	],
};

if (config.mode === 'production') {
	config.plugins = (config.plugins || []).concat([
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: '"production"',
			},
		}),
	]);
}

if (process.env.HMR === 'true') {
	config.plugins = (config.plugins || []).concat([
		new ChromeExtensionReloader(),
	]);
}

module.exports = config;