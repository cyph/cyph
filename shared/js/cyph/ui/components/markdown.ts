import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for rendering Markdown.
 */
export class Markdown {
	/** Component title. */
	public static title: string	= 'cyphMarkdown';

	/** Component configuration. */
	public static config		= {
		bindings: {
			markdown: '<'
		},
		controller: Markdown,
		template: ''
	};


	public markdown: string;

	constructor ($scope, $element) { (async () => {
		while (!this.markdown) {
			await Util.sleep(100);
		}

		const markdown: any	= new self['markdownit']({
			html: false,
			breaks: true,
			linkify: true,
			typographer: true,
			quotes:
				(
					Env.language === 'ru' ?
						'«»' :
						Env.language === 'de' ?
							'„“' :
							'“”'
				) +
				'‘’'
			,
			highlight: s => self['microlight'].process(s, $element.css('color'))
		}).
			disable('image').
			use(self['markdownitSup']).
			use(self['markdownitEmoji'])
		;

		$element.html(
			DOMPurify.sanitize(
				markdown.render(this.markdown).

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
		);
	})(); }
}
