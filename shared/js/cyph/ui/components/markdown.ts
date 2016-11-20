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
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphMarkdown';

	/** Component configuration. */
	public static config		= {
		bindings: {
			markdown: '<'
		},
		controller: class {
			private markdownIt: any;

			public markdown: string;

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

			constructor (private $element: JQuery) {
				this.markdownIt	= new self['markdownit']({
					breaks: true,
					highlight: s => self['microlight'].process(
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
					use(self['markdownitSup']).
					use(self['markdownitEmoji'])
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
