import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Inject,
	Input,
	OnChanges,
	OnInit,
	Optional
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Router} from '@angular/router';
import $ from 'jquery';
import MarkdownIt from 'markdown-it';
import * as markdownItEmoji from 'markdown-it-emoji';
import markdownItSup from 'markdown-it-sup';
import {microlight} from 'microlight-string';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {EnvService} from '../../services/env.service';
import {HtmlSanitizerService} from '../../services/html-sanitizer.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';
import {openWindow} from '../../util/window';

/**
 * Angular component for rendering Markdown.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-markdown',
	styleUrls: ['./markdown.component.scss'],
	templateUrl: './markdown.component.html'
})
export class MarkdownComponent
	extends BaseProvider
	implements OnChanges, OnInit
{
	/** @ignore */
	private initiated: boolean = false;

	/** @ignore */
	private readonly markdownIt: MarkdownIt;

	/** Rendered HTML. */
	public readonly html = new BehaviorSubject<SafeHtml | undefined>(undefined);

	/** String of Markdown to render as HTML and add to the DOM. */
	@Input() public markdown?: string;

	/** If true, <a> tags with # links will be rendered with the attribute target='_self'. */
	@Input() public targetSelf?: boolean;

	/** @ignore */
	private async onChanges () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.markdown) {
			this.initiated = true;
		}
		else if (this.initiated) {
			await sleep(10000);

			const $element = $(this.elementRef.nativeElement);

			$element
				.height($element.height() || 0)
				.width($element.width() || 0);
		}

		let html = this.markdownIt.render(this.markdown || '');
		while (true) {
			const newHTML = html
				/* Merge blockquotes like reddit */
				.replace(/\<\/blockquote>\s*\<blockquote>/g, '')
				/* Images */
				.replace(
					/!\<a href="(data:image\/(png|jpeg|gif)\;.*?)"><\/a>/g,
					(_, value: string) => {
						const img = document.createElement('img');
						img.src = value;
						return img.outerHTML;
					}
				);

			if (newHTML === html) {
				break;
			}

			html = newHTML;
		}

		/* Gracefully handle protocol-less links */
		if (!this.targetSelf) {
			html = html
				.replace(/\<a href="/g, '<a target="_blank" href="')
				.replace(
					/(href=")(((?!:\/\/).)*?")/g,
					(_, a, b) => `${a}http://${b}`
				)
				.replace(/href="http:\/\/mailto:/g, 'href="mailto:');
		}

		html = this.htmlSanitizerService.sanitize(html);

		if (this.targetSelf) {
			html = html.replace(/\<a href="#/g, '<a router-link="');
		}

		this.html.next(this.domSanitizer.bypassSecurityTrustHtml(html));
	}

	/** Handle router link clicks. */
	public click (e: MouseEvent) : void {
		if (!(e.target instanceof HTMLAnchorElement) || !this.router) {
			return;
		}

		e.preventDefault();

		const routerLink = e.target.getAttribute('router-link');

		if (routerLink) {
			this.router.navigate(routerLink.split('/'));
		}
		else if (e.target.href) {
			openWindow(e.target.href);
		}
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		this.onChanges();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.onChanges();
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		@Inject(Router) @Optional() private readonly router: Router | undefined,

		/** @ignore */
		private readonly htmlSanitizerService: HtmlSanitizerService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.markdownIt = new MarkdownIt({
			breaks: true,
			highlight: s =>
				microlight.process(
					s,
					$(this.elementRef.nativeElement).css('color')
				),
			html: false,
			linkify: true,
			typographer: false
			/*
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
			*/
		})
			.disable('image')
			.use(markdownItEmoji)
			.use(markdownItSup);

		this.markdownIt.linkify.tlds('app', true);
	}
}
