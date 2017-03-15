# Cordova/PhoneGap UserAgent Plugin #
Plugin for Cordova 3.0+ that allows you to change your User-Agent for HTTP requests.

## Adding the plugin to your project ##
To install the plugin, use the Cordova CLI and enter the following:<br />
`cordova plugin add https://github.com/LouisT/cordova-useragent`

## Platforms ##
- Android
- iOS (9+, with [WKWebView plugin](https://github.com/apache/cordova-plugin-wkwebview-engine))

## Use ##
To set your User-Agent:<br />
`UserAgent.set(useragent)`

To get your current User-Agent:<br />
`UserAgent.get(function(ua) { })`

To set your User-Agent back to the default:<br />
`UserAgent.reset()`
