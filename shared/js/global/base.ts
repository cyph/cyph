/// <reference path="../typings/storage.d.ts" />
/// <reference path="../typings/websign.d.ts" />


'use strict';


var IS_WEB	= typeof window === 'object';

var window: Window		= window || this;
var document: Document	= document || this;
var self: Window		= self || this;

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
