/* Redirect to appropriate translation */
var defaultLanguage	= 'en';
var language		=
	(localStorage && localStorage.forceLanguage) ||
	navigator.language ||
	navigator.userLanguage ||
	navigator.browserLanguage ||
	navigator.systemLanguage ||
	defaultLanguage
;

if (['zh-CHS', 'zh-CHT'].indexOf(language) < 0) {
	language	= language.split('-')[0];
}

var possibleLanguage	= document.location.pathname.split('/')[1];

if (language == defaultLanguage) {
	language	= defaultLanguage;
}
else if (possibleLanguage.length == 2 || ['zh-CHS', 'zh-CHT, mww', 'tlh'].indexOf(possibleLanguage) > -1) {
	language	= possibleLanguage;
}
else {
	document.location.pathname	= '/' + language + document.location.pathname;
}
