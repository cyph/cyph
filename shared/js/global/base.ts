/**
 * @file Normalises global namespace across varying runtime environments.
 */


/// <reference path="../typings/main.d.ts" />


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
	'Audio',
	'onthreadmessage',
	'FontsCSS',
	'Translations',
	'WebSign',
	'Ntru',
	'Sodium'
]) {
	if (!(k in self)) {
		self[k]	= null;
	}
}


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


Ntru	= self['ntru'] || {};
Sodium	= self['sodium'] || {};
