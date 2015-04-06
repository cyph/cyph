/// <reference path="websign.d.ts" />


var window: Window		= window || this;
var document: Document	= document || this;

var history: History;
var navigator: Navigator;
var crypto: Crypto;

var language: string;
var processUrlState: Function;
var webSign: WebSign.WebSign;

var Controller: any;
