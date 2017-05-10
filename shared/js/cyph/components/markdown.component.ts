import {Component, ElementRef, Input, OnChanges} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import * as DOMPurify from 'dompurify';
import * as $ from 'jquery';
import * as MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';
import * as markdownItSup from 'markdown-it-sup';
import {microlight} from 'microlight-string';
import {DialogService} from '../services/dialog.service';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for rendering Markdown.
 */
@Component({
	selector: 'cyph-markdown',
	styleUrls: ['../../../css/components/markdown.scss'],
	templateUrl: '../../../templates/markdown.html'
})
export class MarkdownComponent implements OnChanges {
	/** @ignore */
	private initiated: boolean	= false;

	/** @ignore */
	private readonly markdownIt: MarkdownIt.MarkdownIt;

	/** Rendered HTML. */
	public html?: SafeHtml;

	/** String of Markdown to render as HTML and add to the DOM. */
	@Input() public markdown?: string;

	/** Handle clicks to display image dialogs when needed. */
	public click (event: MouseEvent) : void {
		if (event.srcElement instanceof HTMLImageElement) {
			this.dialogService.image(event.srcElement.src);
		}
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.markdown !== undefined) {
			this.initiated	= true;
		}
		else if (this.initiated) {
			await util.sleep(10000);

			const $element	= $(this.elementRef.nativeElement);

			$element.
				height($element.height()).
				width($element.width())
			;
		}

		this.html	= this.domSanitizer.bypassSecurityTrustHtml(
			DOMPurify.sanitize(
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
					FORBID_TAGS: ['style']
				}
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly dialogService: DialogService,

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
