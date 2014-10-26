/* Redirect to appropriate translation */
var language	=
	(localStorage && localStorage.forceLanguage) ||
	navigator.language ||
	navigator.userLanguage ||
	navigator.browserLanguage ||
	navigator.systemLanguage ||
	'en'
;

if (['zh-CHS', 'zh-CHT'].indexOf(language) < 0) {
	language	= language.split('-')[0];
}

var req	= new XMLHttpRequest();
req.open('GET', '/' + language + '.html', false);
req.send();
document.write(req.responseText);
