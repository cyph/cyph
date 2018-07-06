import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';


/**
 * Angular directive for autofocus.
 */
@Directive({
	selector: '[cyphAutofocus]'
})
export class AutofocusDirective implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
