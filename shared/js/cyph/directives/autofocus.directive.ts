import {
	Directive,
	ElementRef,
	Input,
	OnChanges,
	OnInit,
	Renderer2
} from '@angular/core';
import * as $ from 'jquery';
import {BaseProvider} from '../base-provider';
import {EnvService} from '../services/env.service';
import {sleep, waitForIterable} from '../util/wait';

/**
 * Automatically focuses elements.
 */
@Directive({
	selector: '[cyphAutofocus]'
})
export class AutofocusDirective
	extends BaseProvider
	implements OnChanges, OnInit
{
	/** @ignore */
	private static readonly loadComplete: Promise<void> = waitForIterable(() =>
		$('body.load-complete')
	)
		.catch(() => {})
		.then(async () => sleep(750));

	/** @ignore */
	private static readonly loading: Promise<void> = Promise.all([
		AutofocusDirective.loadComplete,
		new Promise<void>(resolve => {
			$(document.body).one('mousedown', () => {
				resolve();
			});
		})
	])
		.then(async () => sleep(750))
		.catch(() => {});

	/** Indicates whether directive should be active. */
	@Input() public cyphAutofocusEnabled: boolean = true;

	/** @ignore */
	private async init () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.cyphAutofocusEnabled) {
			return;
		}

		if (this.envService.isCordovaMobile) {
			await AutofocusDirective.loadComplete;
		}
		else if (this.envService.isMobileOS) {
			await AutofocusDirective.loading;
		}

		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'autofocus',
			''
		);

		const $elem = $(<HTMLElement> this.elementRef.nativeElement);
		await waitForIterable(() => $elem.filter(':visible'));
		$elem.trigger('focus');
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.init();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.init();
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
