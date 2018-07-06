import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';


/**
 * Angular directive for enable last pass.
 */
@Directive({
	selector: '[cyphEnableLastPass]'
})
export class EnableLastPassDirective implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
