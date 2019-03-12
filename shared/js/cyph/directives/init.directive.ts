import {Directive, ElementRef, EventEmitter, OnInit, Output} from '@angular/core';


/**
 * Event that fires on element load.
 */
@Directive({
	/* tslint:disable-next-line:directive-selector */
	selector: '[init]'
})
export class InitDirective implements OnInit {
	/** Init event. */
	@Output() readonly init	= new EventEmitter<HTMLElement|undefined>();

	/** @inheritDoc */
	ngOnInit() {
		this.init.emit(
			this.elementRef.nativeElement instanceof HTMLElement ?
				this.elementRef.nativeElement :
				undefined
		);
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef
	) {}
}
