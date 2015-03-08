var defaultLanguage			= 'en';

var language				= (
	navigator.language ||
	navigator.userLanguage ||
	navigator.browserLanguage ||
	navigator.systemLanguage ||
	defaultLanguage
).toLowerCase();

var languagePair			= language.split('-');

var translatedAttributes	= ['content', 'placeholder', 'aria-label', 'label'];

function htmlDecode (value) {
	return $('<div />').html(value).text();
}


if (typeof translations != 'undefined') {
	if (localStorage && localStorage.forceLanguage) {
		language	= localStorage.forceLanguage.toLowerCase();
	}

	if (language == 'nb') {
		language	= 'no';
	}
	if (language == 'zh-cn') {
		language	= 'zh-chs';
	}
	if (language == 'zh-tw') {
		language	= 'zh-cht';
	}


	if (language != defaultLanguage) {
		var o			= {};
		var translation	= translations[language];

		Object.keys(translation).forEach(function (k) {
			o[k]	= htmlDecode(translation[k]);
		});

		translation	= o;
		delete o;


		$(function () {
			$('[translate]').each(function () {
				var $this	= $(this);
				var ngBind	= $this.attr('ng-bind');
				var html	= $this.html().trim();

				for (var i = 0 ; i < translatedAttributes.length ; ++i) {
					var attr	= translatedAttributes[i];
					var value	= $this.attr(attr);

					if (value) {
						var valueTranslation	= translation[value];

						if (valueTranslation) {
							$this.attr(attr, valueTranslation);
						}
					}
				}

				if (ngBind) {
					$this.attr('ng-bind', ngBind.replace(/"([^"]*)"/g, function (match, value) {
						var valueTranslation	= translation[value];

						if (valueTranslation) {
							return '"' + valueTranslation + '"';
						}
						else {
							return match;
						}
					}));
				}

				if (html) {
					$this.html(html.replace(/(.*?)(\{\{.*?\}\}|$)/g, function (match, value, binding) {
						var valueTranslation	= translation[value];

						if (valueTranslation) {
							return valueTranslation + binding;
						}
						else {
							return match;
						}
					}));
				}
			});
		});
	}
}
