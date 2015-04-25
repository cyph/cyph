module Cyph {
	export module UI {
		export module Directives {
			export class Markdown {
				public static title: string	= 'ngCyphMarkdown';

				private static _	= (() => {
					let markdown	= new self['markdownit']({
						html: false,
						breaks: true,
						linkify: true,
						typographer: true,
						quotes:
							(
								Cyph.Env.language === 'ru' ?
									'«»' :
									Cyph.Env.language === 'de' ?
										'„“' :
										'“”'
							) +
							'‘’'
						,
						highlight: (str, lang) => {
							if (lang && self['hljs'].getLanguage(lang)) {
								try {
									return self['hljs'].highlight(lang, str).value;
								}
								catch (_) {}
							}

							try {
								return self['hljs'].highlightAuto(str).value;
							}
							catch (_) {}

							return '';
						}
					}).
						disable('image').
						use(self['markdownitSup']).
						use(self['markdownitEmoji'])
					;

					markdown.renderer.rules.emoji	= (token, idx) =>
						self['twemoji'].parse(
							token[idx].content,
							{base: '/lib/bower_components/twemoji/'}
						)
					;


					angular.module(Markdown.title, []).directive(Markdown.title, () => ({
						restrict: 'A',
						replace: true,
						link: (scope, element, attrs) => {
							let set	= (val: string) : void => {
								val	= markdown.render(val);

								/* Merge blockquotes like reddit */
								val	= val.replace(/\<\/blockquote\>\n\<blockquote\>\n/g, '');

								/* Images */
								val	= val.replace(
									/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g,
									(match, value: string) => '<img src="' + value + '" />'
								);

								element.html(val);
							};

							set(scope[Markdown.title] || '');
							scope.$watch(attrs[Markdown.title], set);
						}
					}));
				})();
			}
		}
	}
}
