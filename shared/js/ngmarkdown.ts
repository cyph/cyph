/// <reference path="../lib/typings/angularjs/angular.d.ts" />

(function () {
	var title		= 'ngMarkdown';


	var markdownit: any;
	var markdownitSup: any;
	var markdownitEmoji: any;
	var hljs: any;
	var twemoji: any;

	var markdown	= new markdownit({
		html: false,
		linkify: true,
		typographer: true,
		quotes: (language == 'ru' ? '«»' : language == 'de' ? '„“' : '“”') + '‘’',
		highlight: function (str, lang) {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return hljs.highlight(lang, str).value;
				}
				catch (__) {}
			}

			try {
				return hljs.highlightAuto(str).value;
			}
			catch (__) {}

			return '';
		}
	}).
		disable('image').
		use(markdownitSup).
		use(markdownitEmoji)
	;

	markdown.renderer.rules.emoji	= function(token, idx) {
		return twemoji.parse(token[idx].content, {base: '/lib/bower_components/twemoji/'});
	};


	angular.module(title).directive(title, function () {
		return {
			restrict: 'A',
			replace: true,
			link: function (scope, element, attrs) {
				function set(val) {
					val	= markdown.render(val);

					/* Merge blockquotes like reddit */
					val	= val.replace(/\<\/blockquote\>\n\<blockquote\>\n/g, '');

					/* Images */
					val	= val.replace(/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g, function (match, value) {
						return '<img src="' + value + '" />';
					});

					element.html(val);
				}

				set(scope[title] || '');
				scope.$watch(attrs[title], set);
			}
		};
	});
}());