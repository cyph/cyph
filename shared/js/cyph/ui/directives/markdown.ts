namespace Cyph {
	export namespace UI {
		export namespace Directives {
			/**
			 * Angular directive for rendering Markdown.
			 */
			export class Markdown {
				/** Module/directive title. */
				public static title: string	= 'cyphMarkdown';

				private static _	= (() => {
					const markdown: any	= new self['markdownit']({
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
							{base: Env.homeUrl + 'lib/bower_components/twemoji/'}
						)
					;


					angular.module(Markdown.title, []).directive(Markdown.title, () => ({
						restrict: 'A',
						replace: true,
						link: (scope, element, attrs) => {
							const set	= (val: string) =>
								element.html(
									self['DOMPurify'].sanitize(
										markdown.render(val).

											/* Merge blockquotes like reddit */
											replace(/\<\/blockquote>\n\<blockquote>\n/g, '').

											/* Images */
											replace(
												/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g,
												(match, value: string) => {
													const img: HTMLImageElement	= document.createElement('img');
													img.src	= value;
													return img.outerHTML;
												}
											).

											/* Block window.opener in new window */
											replace(
												/\<a href=/g,
												'<a rel="noreferrer" href='
											)
										,
										{
											FORBID_TAGS: ['style'],
											SAFE_FOR_JQUERY: true
										}
									)
								)
							;

							set(scope[Markdown.title] || '');
							scope.$watch(attrs[Markdown.title], set);
						}
					}));
				})();
			}
		}
	}
}
