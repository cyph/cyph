/// <reference path="../typings/storage.d.ts" />
/// <reference path="../typings/websign.d.ts" />


'use strict';


var IS_WEB	= typeof window === 'object';

var window: Window;
var document: Document;
var self: Window;

if (!window) {
	window		= this;
}
if (!document) {
	document	= this;
}
if (!self) {
	self		= this;
}

var crypto: Crypto;
var history: History;
var location: Location;
var navigator: Navigator;
var Notification: any;

var language: string;
var localStorage: Storage;
var processUrlState: Function;
var WebSign: WebSign;
var Translations: {[language: string] : {[text: string] : string}};
var onthreadmessage: (e: MessageEvent) => any;


var requireModules	= (dependencies: () => any, f: Function) => {
	if (dependencies()) {
		f();
	}
	else {
		let intervalId	= setInterval(() => {
			if (dependencies()) {
				clearInterval(intervalId);
				f();
			}
		}, 25);
	}
};
