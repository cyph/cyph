/// <reference path="../typings/iwebsign.d.ts" />
/// <reference path="../typings/storage.d.ts" />


'use strict';


let IS_WEB	= typeof window === 'object';

for (let k in ['window', 'document', 'self']) {
	if (!(k in this)) {
		this[k]	= this;
	}
}

for (let k in [
	'crypto',
	'history',
	'location',
	'localStorage',
	'navigator',
	'Notification'
]) {
	if (!(k in this)) {
		this[k]	= null;
	}
}


let _crypto			= this.crypto;
let crypto: Crypto	= _crypto;

let _Notification		= this.Notification;
let Notification: any	= _Notification;

let _WebSign			= this.WebSign;
let WebSign: IWebSign	= _WebSign;

let onthreadmessage: (e: MessageEvent) => any;
let processUrlState: () => void;
let Translations: {[language: string] : {[text: string] : string}};


let requireModules	= (dependencies: () => any, f: Function) => {
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
