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

if (language == defaultLanguage || document.location.pathname.indexOf('/' + defaultLanguage + '/') == 0) {
	language	= defaultLanguage;
}
else {
	document.location.pathname	= '/' + language + document.location.pathname;
}
