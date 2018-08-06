import {Directive, ElementRef, Input, OnInit, Renderer2} from '@angular/core';
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
export class AutofocusDirective extends BaseProvider implements OnInit {
	/** @ignore */
	private static readonly loadComplete: Promise<void>	=
		waitForIterable(() => $('body.load-complete')).catch(() => {}).then(async () => sleep(750))
	;

	/** @ignore */
	private static readonly loading: Promise<void>	= Promise.all([
		AutofocusDirective.loadComplete,
		new Promise<void>(resolve => {
			$(document.body).one('mousedown', () => { resolve(); });
		})
	]).then(async () =>
		sleep(750)
	).catch(
		() => {}
	);

	/** Indicates whether directive should be active. */
	@Input() public cyphAutofocus?: boolean;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || this.cyphAutofocus === false) {
			return;
		}

		if (this.envService.isCordova) {
			await AutofocusDirective.loadComplete;
		}
		else if (this.envService.isMobile) {
			await AutofocusDirective.loading;
		}

		this.renderer.setAttribute(this.elementRef.nativeElement, 'autofocus', '');

		const $elem	= $(<HTMLElement> this.elementRef.nativeElement);
		await waitForIterable(() => $elem.filter(':visible'));
		$elem.trigger('focus');
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
