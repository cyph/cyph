import {Directive, ElementRef, Renderer2} from '@angular/core';


/**
 * Adds rel='noopener noreferrer' to all anchor elements.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: 'a'
})
export class AnchorDirective {
	constructor (elementRef: ElementRef, renderer: Renderer2) {
		if (elementRef.nativeElement) {
			renderer.setAttribute(elementRef.nativeElement, 'rel', 'noopener noreferrer');
		}
	}
}
