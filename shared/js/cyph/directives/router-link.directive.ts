import {Directive, ElementRef, Renderer2} from '@angular/core';


/**
 * Adds router-link CSS class to router links.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: '[routerLink]'
})
export class RouterLinkDirective {
	constructor (elementRef: ElementRef, renderer: Renderer2) {
		if (elementRef.nativeElement) {
			renderer.addClass(elementRef.nativeElement, 'router-link');
		}
	}
}
