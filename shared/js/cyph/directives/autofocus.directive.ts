import {Directive, ElementRef, Input, OnInit, Renderer2} from '@angular/core';
import * as $ from 'jquery';
import {waitForIterable} from '../util/wait';


/**
 * Automatically focuses elements.
 */
@Directive({
	selector: '[cyphAutofocus]'
})
export class AutofocusDirective implements OnInit {
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
		$elem.focus();
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
