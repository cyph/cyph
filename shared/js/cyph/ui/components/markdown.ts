import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for rendering Markdown.
 */
@Directive({
	selector: 'cyph-markdown'
})
export class Markdown
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphMarkdown';

	/** Component configuration. */
	public static config		= {
		bindings: {
			markdown: '<'
		},
		/* tslint:disable-next-line:max-classes-per-file */
		controller: class {
			/** @ignore */
			private markdownIt: any;

			/** @ignore */
			public markdown: string;

			/** @ignore */
			public async $onChanges (changes: any) : Promise<void> {
				if (this.markdown === null) {
					await Util.sleep(10000);

					this.$element.
						height(this.$element.height()).
						width(this.$element.width()).
						css('display', 'inline-block')
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
					)
				);
			}

			constructor (
				/** @ignore */
				private $element: JQuery
			) {
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
							Env.language === 'ru' ?
								'«»' :
								Env.language === 'de' ?
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
		},
		template: ''
	};


	/** @ignore */
	@Input() public markdown: string;

	/** @ignore */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(Markdown.title, elementRef, injector);
	}
}
