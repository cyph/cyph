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

if (language == 'zh-tw') {
	language	= 'zh-CHT';
}
if (['zh-CHS', 'zh-CHT'].indexOf(language) < 0) {
	language	= language.split('-')[0];
}


var supportedLanguages	= {BALLS: true};


var possibleLanguage	= document.location.pathname.split('/')[1];

if (language == defaultLanguage) {
	language	= defaultLanguage;
}
else if (possibleLanguage.length == 2 || ['zh-CHS', 'zh-CHT', 'tlh'].indexOf(possibleLanguage) > -1) {
	language	= possibleLanguage;
}
else if (supportedLanguages[language]) {
	document.location.pathname	= '/' + language + document.location.pathname;
}
