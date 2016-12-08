import {Component, ElementRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {env} from '../../env';
import {util} from '../../util';


/**
 * Angular component for rendering Markdown.
 */
@Component({
	selector: 'cyph-markdown',
	templateUrl: '../../../../templates/markdown.html'
})
export class Markdown implements OnChanges {
	/** @ignore */
	private readonly $element: JQuery;

	/** @ignore */
	private readonly markdownIt: any;

	/** @ignore */
	@Input() public markdown: string;

	/** @ignore */
	public html: string	= '';

	/** @ignore */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (this.markdown === null) {
			await util.sleep(10000);

			this.$element.
				height(this.$element.height()).
				width(this.$element.width()).
				css('display', 'inline-block')
			;
		}

		this.html	= DOMPurify.sanitize(
			this.markdownIt.render(this.markdown || '').

				/* Merge blockquotes like reddit */
				replace(/\<\/blockquote>\n\<blockquote>\n/g, '').

				/* Images */
				replace(
					/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g,
					(match: string, value: string) => {
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
		);
	}

	constructor (elementRef: ElementRef) {
		this.$element	= $(elementRef.nativeElement);

		this.markdownIt	= new (<any> self).markdownit({
			breaks: true,
			highlight: (s: string) => (<any> self).microlight.process(
				s,
				this.$element.css('color')
			),
			html: false,
			linkify: true,
			quotes:
				(
					env.language === 'ru' ?
						'«»' :
						env.language === 'de' ?
							'„“' :
							'“”'
				) +
				'‘’'
			,
			typographer: true
		}).
			disable('image').
			use((<any> self).markdownitSup).
			use((<any> self).markdownitEmoji)
		;
	}
}
