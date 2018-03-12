import {Component, ElementRef, Input, OnChanges} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import * as $ from 'jquery';
import * as MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';
import * as markdownItSup from 'markdown-it-sup';
import {microlight} from 'microlight-string';
import {EnvService} from '../../services/env.service';
import {HtmlSanitizerService} from '../../services/html-sanitizer.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';


/**
 * Angular component for rendering Markdown.
 */
@Component({
	selector: 'cyph-markdown',
	styleUrls: ['./markdown.component.scss'],
	templateUrl: './markdown.component.html'
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

	/** If true, <a> tags with # links will be rendered with the attribute target='_self'. */
	@Input() public targetSelf?: boolean;

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.markdown) {
			this.initiated	= true;
		}
		else if (this.initiated) {
			await sleep(10000);

			const $element	= $(this.elementRef.nativeElement);

			$element.
				height($element.height() || 0).
				width($element.width() || 0)
			;
		}

		let html	= this.htmlSanitizerService.sanitize(
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
		);

		if (this.targetSelf) {
			html	= html.replace(/\<a href="#/g, '<a target="_self" href="#');
		}

		this.html	= this.domSanitizer.bypassSecurityTrustHtml(html);
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly htmlSanitizerService: HtmlSanitizerService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
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
