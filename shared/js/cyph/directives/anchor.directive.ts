import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';


/**
 * Adds rel='noopener noreferrer' to all anchor elements.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'a'
})
export class AnchorDirective implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		if (this.elementRef.nativeElement) {
			this.renderer.setAttribute(
				this.elementRef.nativeElement,
				'rel',
				'noopener noreferrer'
			);
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
