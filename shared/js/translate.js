/* Redirect to appropriate translation */
var defaultLanguage	= 'en';
var language		=
	navigator.language ||
	navigator.userLanguage ||
	navigator.browserLanguage ||
	navigator.systemLanguage ||
	defaultLanguage
;
var languagePair	= language.split('-');

if (localStorage && localStorage.forceLanguage) {
	language	= localStorage.forceLanguage;
}

if (language == 'zh-tw') {
	language	= 'zh-CHT';
}
if (['zh-CHS', 'zh-CHT'].indexOf(language) < 0) {
	language	= languagePair[0];
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
