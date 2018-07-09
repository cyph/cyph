import {Directive, ElementRef, Input, OnInit, Renderer2} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../services/env.service';
import {sleep, waitForIterable} from '../util/wait';


/**
 * Automatically focuses elements.
 */
@Directive({
	selector: '[cyphAutofocus]'
})
export class AutofocusDirective implements OnInit {
	/** @ignore */
	private static readonly loading: Promise<void>	=
		waitForIterable(() => $('body.load-complete')).then(async () => sleep(1500))
	;

	/** Indicates whether directive should be active. */
	@Input() public cyphAutofocus?: boolean;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || this.cyphAutofocus === false) {
			return;
		}

		this.renderer.setAttribute(this.elementRef.nativeElement, 'autofocus', '');

		const $elem	= $(<HTMLElement> this.elementRef.nativeElement);
		await waitForIterable(() => $elem.filter(':visible'));

		if (this.envService.isMobile) {
			await AutofocusDirective.loading;
		}

		$elem.trigger('focus');
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
