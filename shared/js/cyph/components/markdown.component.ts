import {Component, ElementRef, Input, OnChanges, Renderer, SimpleChanges} from '@angular/core';
import * as DOMPurify from 'dompurify';
import * as $ from 'jquery';
import * as MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';
import * as markdownItSup from 'markdown-it-sup';
import {microlight} from 'microlight-string';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for rendering Markdown.
 */
@Component({
	selector: 'cyph-markdown',
	styleUrls: ['../../css/components/markdown.css'],
	templateUrl: '../../../templates/markdown.html'
})
export class MarkdownComponent implements OnChanges {
	/** @ignore */
	private initiated: boolean	= false;

	/** @ignore */
	private readonly markdownIt: MarkdownIt.MarkdownIt;

	/** String of Markdown to render as HTML and add to the DOM. */
	@Input() public markdown?: string;

	/** @ignore */
	public async ngOnChanges (_CHANGES: SimpleChanges) : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			this.renderer.setText(this.elementRef.nativeElement, this.markdown || '');
			return;
		}

		const $element	= $(this.elementRef.nativeElement);

		if (this.markdown !== undefined) {
			this.initiated	= true;
		}
		else if (this.initiated) {
			await util.sleep(10000);

			$element.
				height($element.height()).
				width($element.width()).
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
		$html.find('a').each((_: number, a: HTMLAnchorElement) => {
			$(a).attr('rel', 'noreferrer');
		});

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

		if (this.envService.isMobile) {
			$html.addClass('mobile');
		}

		$element.empty().append($html);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer,

		/** @ignore */
		private readonly envService: EnvService
	) {
		this.markdownIt	= new MarkdownIt({
			breaks: true,
			highlight: (s: string) => microlight.process(
				s,
				$(this.elementRef.nativeElement).css('color')
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
			use(markdownItEmoji).
			use(markdownItSup)
		;
	}
}
