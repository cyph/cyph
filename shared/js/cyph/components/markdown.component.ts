import {Component, ElementRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {MarkdownIt} from 'markdown-it';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for rendering Markdown.
 */
@Component({
	selector: 'cyph-markdown',
	templateUrl: '../../../templates/markdown.html'
})
export class MarkdownComponent implements OnChanges {
	/** @ignore */
	private readonly $element: JQuery;

	/** @ignore */
	private readonly markdownIt: MarkdownIt;

	/** @ignore */
	private initiated: boolean	= false;

	/** String of Markdown to render as HTML and add to the DOM. */
	@Input() public markdown: string;

	/** @ignore */
	public async ngOnChanges (_CHANGES: SimpleChanges) : Promise<void> {
		if (this.markdown !== undefined) {
			this.initiated	= true;
		}
		else if (this.initiated) {
			await util.sleep(10000);

			this.$element.
				height(this.$element.height()).
				width(this.$element.width()).
				css('display', 'inline-block')
			;
		}

		const $html	= $(DOMPurify.sanitize(
			this.markdownIt.render(this.markdown || '').

				/* Merge blockquotes like reddit */
				replace(/\<\/blockquote>\n\<blockquote>\n/g, '').

				/* Images */
				replace(
					/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g,
					(_: string, value: string) => {
						const img: HTMLImageElement	= document.createElement('img');
						img.src	= value;
						return img.outerHTML;
					}
				)
			,
			{
				FORBID_TAGS: ['style'],
				SAFE_FOR_JQUERY: true
			}
		));

		/* Block window.opener in new window */
		$html.find('a').each((_: number, a: HTMLAnchorElement) =>
			$(a).attr('rel', 'noreferrer')
		);

		/* Process image lightboxes */
		$html.find('img').each((_: number, img: HTMLImageElement) => {
			const $img	= $(img);
			const $a	= $(document.createElement('a'));

			$a.attr('href', $img.attr('src'));

			$img.before($a);
			$img.detach();
			$a.append($img);

			(<any> $a).magnificPopup({type: 'image'});
		});

		this.$element.empty().append($html);
	}

	constructor (elementRef: ElementRef, envService: EnvService) {
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
					envService.language === 'ru' ?
						'«»' :
						envService.language === 'de' ?
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
