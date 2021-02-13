import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {BaseProvider} from '../base-provider';

/**
 * Angular directive for product tour.
 */
@Directive({
	selector: '[cyphProductTour]'
})
export class ProductTourDirective extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {
		super();
	}
}
