/**
 * @file Normalises global namespace across varying runtime environments.
 */


/// <reference path="../typings/main.d.ts" />


self['IS_WEB']	= typeof self['IS_WEB'] !== 'undefined' ?
	self['IS_WEB'] :
	typeof window === 'object'
;

for (let k of ['window', 'document']) {
	if (!(k in self)) {
		self[k]	= self;
	}
}

for (let k of [
	'history',
	'location',
	'navigator',
	'Audio',
	'customBuild',
	'customBuildFavicon',
	'onthreadmessage',
	'Translations'
]) {
	if (!(k in self)) {
		self[k]	= null;
	}
}

self['locationData']	= typeof self['locationData'] !== 'undefined' ?
	self['locationData'] :
	location
;

self['navigatorData']	= typeof self['navigatorData'] !== 'undefined' ?
	self['navigatorData'] :
	navigator
;
