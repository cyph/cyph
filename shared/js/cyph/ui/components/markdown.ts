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


	private markdownIt: any;

	public markdown: string;

	public async $onChanges (changes: any) : Promise<void> {
		if (this.markdown === null) {
			this.$element.css('display', 'block');

			await Util.sleep(10000);

			this.$element.
				height(this.$element.height()).
				width(this.$element.width())
			;
		}

		this.$element.html(
			DOMPurify.sanitize(
				this.markdownIt.render(this.markdown || '').

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
	}

	constructor ($scope, private $element) {
		this.markdownIt	= new self['markdownit']({
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
			highlight: s => self['microlight'].process(s, this.$element.css('color'))
		}).
			disable('image').
			use(self['markdownitSup']).
			use(self['markdownitEmoji'])
		;
	}
}
