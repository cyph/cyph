import {Directive, ElementRef, OnChanges, Renderer2} from '@angular/core';
import {RouterLink} from '@angular/router';
import {BaseProvider} from '../base-provider';

/**
 * Adds router-link CSS class to router links.
 */
@Directive({
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	selector: '[routerLink]'
})
export class RouterLinkDirective extends BaseProvider implements OnChanges {
	/** @see RouterLink.prototype.routerLink */
	private readonly routerLink?: typeof RouterLink.prototype.routerLink;

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.elementRef.nativeElement) {
			return;
		}

		if (this.routerLink !== undefined) {
			this.renderer.addClass(
				this.elementRef.nativeElement,
				'router-link'
			);
		}
		else {
			this.renderer.removeClass(
				this.elementRef.nativeElement,
				'router-link'
			);
		}
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
