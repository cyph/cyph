/// <reference path="globals.ts" />
/// <reference path="../lib/typings/angularjs/angular.d.ts" />


(() => {
	var title: string	= 'ngMarkdown';


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
		highlight: (str, lang) => {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return hljs.highlight(lang, str).value;
				}
				catch (_) {}
			}

			try {
				return hljs.highlightAuto(str).value;
			}
			catch (_) {}

			return '';
		}
	}).
		disable('image').
		use(markdownitSup).
		use(markdownitEmoji)
	;

	markdown.renderer.rules.emoji	= (token, idx) =>
		twemoji.parse(token[idx].content, {base: '/lib/bower_components/twemoji/'})
	;


	angular.module(title).directive(title, () => ({
		restrict: 'A',
		replace: true,
		link: (scope, element, attrs) => {
			function set (val: string) : void {
				val	= markdown.render(val);

				/* Merge blockquotes like reddit */
				val	= val.replace(/\<\/blockquote\>\n\<blockquote\>\n/g, '');

				/* Images */
				val	= val.replace(/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g, (match, value: string) =>
					'<img src="' + value + '" />'
				);

				element.html(val);
			}

			set(scope[title] || '');
			scope.$watch(attrs[title], set);
		}
	}));
})();