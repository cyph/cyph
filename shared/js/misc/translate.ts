let defaultLanguage			= 'en';

language					= (
	navigator.language ||
	navigator.userLanguage ||
	navigator.browserLanguage ||
	navigator.systemLanguage ||
	defaultLanguage
).toLowerCase();

let languagePair			= language.split('-');

let translatedAttributes	= ['content', 'placeholder', 'aria-label', 'label'];

function htmlDecode (value) {
	return $('<div />').html(value).text();
}


if (typeof translations !== 'undefined') {
	if (localStorage && localStorage.forceLanguage) {
		language	= localStorage.forceLanguage.toLowerCase();
	}

	if (language === 'nb') {
		language	= 'no';
	}
	if (language === 'zh-cn') {
		language	= 'zh-chs';
	}
	if (language === 'zh-tw') {
		language	= 'zh-cht';
	}


	if (language !== defaultLanguage) {
		let translation	= {};
		let o			= translations[language];

		if (o) {
			Object.keys(o).forEach(function (k) {
				translation[k]	= htmlDecode(o[k]);
			});
		}


		$(function () {
			$('[translate]').each(function () {
				let $this	= $(this);
				let ngBind	= $this.attr('ng-bind');
				let html	= $this.html().trim();

				for (let i = 0 ; i < translatedAttributes.length ; ++i) {
					let attr	= translatedAttributes[i];
					let value	= $this.attr(attr);

					if (value) {
						let valueTranslation	= translation[value];

						if (valueTranslation) {
							$this.attr(attr, valueTranslation);
						}
					}
				}

				if (ngBind) {
					$this.attr('ng-bind', ngBind.replace(/"([^"]*)"/g, function (match, value) {
						let valueTranslation	= translation[value];

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
						let valueTranslation	= translation[value];

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
