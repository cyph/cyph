/**
 * @file Normalises global namespace across varying runtime environments,
 * and pulls in all low-footprint references like enums and interfaces.
 */


/// <reference path="../typings/dataview.d.ts" />
/// <reference path="../typings/iwebsign.d.ts" />
/// <reference path="../typings/storage.d.ts" />
/// <reference path="../../lib/typings/main.d.ts" />
/// <reference path="../../lib/bower_components/rxjs/spec/es5.d.ts" />

/// <reference path="../cyph/p2p/enums.ts" />
/// <reference path="../cyph/session/enums.ts" />
/// <reference path="../cyph/ui/chat/enums.ts" />

/// <reference path="../cyph/icontroller.ts" />
/// <reference path="../cyph/channel/ichannel.ts" />
/// <reference path="../cyph/crypto/icastle.ts" />
/// <reference path="../cyph/p2p/ifiletransfer.ts" />
/// <reference path="../cyph/p2p/ip2p.ts" />
/// <reference path="../cyph/session/imessage.ts" />
/// <reference path="../cyph/session/imutex.ts" />
/// <reference path="../cyph/session/isession.ts" />
/// <reference path="../cyph/ui/idialogmanager.ts" />
/// <reference path="../cyph/ui/ilinkconnection.ts" />
/// <reference path="../cyph/ui/inotifier.ts" />
/// <reference path="../cyph/ui/isidebar.ts" />
/// <reference path="../cyph/ui/isignupform.ts" />
/// <reference path="../cyph/ui/chat/ichat.ts" />
/// <reference path="../cyph/ui/chat/icyphertext.ts" />
/// <reference path="../cyph/ui/chat/ielements.ts" />
/// <reference path="../cyph/ui/chat/ip2pmanager.ts" />
/// <reference path="../cyph/ui/chat/iphotomanager.ts" />
/// <reference path="../cyph/ui/chat/iscrollmanager.ts" />


/** @ignore */
const IS_WEB: boolean	= typeof self['IS_WEB'] !== 'undefined' ?
	self['IS_WEB'] :
	typeof window === 'object'
;

for (const k of ['window', 'document']) {
	if (!(k in self)) {
		self[k]	= self;
	}
}

for (const k of [
	'history',
	'location',
	'navigator',
	'Audio'
]) {
	if (!(k in self)) {
		self[k]	= null;
	}
}

/* Angular 2 */
self['Angular2']	= self['ng'];


/* Fix non-compliant crypto implementations */

if (
	typeof crypto !== 'undefined' &&
	crypto.getRandomValues &&
	typeof crypto.getRandomValues(new Uint32Array(1)) === 'undefined'
) {
	const getRandomValues	= crypto.getRandomValues;
	crypto.getRandomValues	= array => {
		getRandomValues.call(crypto, array);
		return array;
	};
}


/**
 * @global Cross-browser container of values in self.location.
 */
const locationData: Location	= typeof self['locationData'] !== 'undefined' ?
	self['locationData'] :
	location
;

/**
 * @global Cross-browser container of values in self.navigator.
 */
const navigatorData: Navigator	= typeof self['navigatorData'] !== 'undefined' ?
	self['navigatorData'] :
	navigator
;


 /**
 * @global Event handler for messages to the current thread.
 */
let onthreadmessage: (e: MessageEvent) => any;

/**
 * @global String containing compiled contents of fonts.scss
 * (only exists in main thread of production environments).
 */
let FontsCSS: string;

/**
 * @global Object containing translations for English phrases
 * (only exists in main thread of production environments).
 */
let Translations: {[language: string] : {[text: string] : string}};

/**
 * @global WebSign object (only created in WebSigned environments).
 */
let WebSign: IWebSign;


/**
 * @global NTRU library.
 */
const Ntru: any		= self['ntru'];

/**
 * @global Sodium library.
 */
const Sodium: any	= self['sodium'];
