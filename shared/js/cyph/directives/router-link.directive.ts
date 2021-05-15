import {
	Directive,
	ElementRef,
	Input,
	OnChanges,
	OnInit,
	Renderer2
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {BaseProvider} from '../base-provider';

/**
 * Adds router-link CSS class to router links.
 */
@Directive({
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	selector: '[routerLink]'
})
export class RouterLinkDirective
	extends BaseProvider
	implements OnChanges, OnInit
{
	/** @see RouterLink.prototype.routerLink */
	@Input()
	public readonly routerLink?: typeof RouterLink.prototype.routerLink;

	/** @ignore */
	private onChanges () : void {
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

	/** @inheritDoc */
	public ngOnChanges () : void {
		this.onChanges();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.onChanges();
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
