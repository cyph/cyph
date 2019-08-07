import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {BaseProvider} from '../base-provider';

/**
 * Adds rel='noopener noreferrer' to all anchor elements.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'a'
})
export class AnchorDirective extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		if (!this.elementRef.nativeElement) {
			return;
		}

		this.renderer.setAttribute(
			this.elementRef.nativeElement,
			'rel',
			'noopener noreferrer'
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {
		super();
	}
}
