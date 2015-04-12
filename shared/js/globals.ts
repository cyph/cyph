/// <reference path="websign.d.ts" />
/// <reference path="storage.d.ts" />


var IS_WEB	= typeof window === 'object';

var window: Window		= window || this;
var document: Document	= document || this;

var crypto: Crypto;
var history: History;
var location: Location;
var navigator: Navigator;

var language: string;
var localStorage: Storage;
var processUrlState: Function;
var webSign: WebSign;

var Controller: any	= {
	update: () => {}
};
