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

var req;

function getCode () {
	req	= new XMLHttpRequest();
	req.open('GET', '/' + language + '.html', false);
	req.send();
}

getCode();
if (req.status != 200) {
	language	= defaultLanguage;
	getCode();
}

$('html').html(req.responseText);
