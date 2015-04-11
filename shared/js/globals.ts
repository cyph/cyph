/// <reference path="websign.d.ts" />
/// <reference path="storage.d.ts" />


var IS_WEB	= typeof window === 'object';

var window: Window		= window || this;
var document: Document	= document || this;

var history: History;
var location: Location;
var navigator: Navigator;
var crypto: Crypto;

var language: string;
var processUrlState: Function;
var webSign: WebSign;
var localStorage: Storage;

var Controller: any	= {
	update: () => {}
};
