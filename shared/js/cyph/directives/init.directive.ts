import {
	Directive,
	ElementRef,
	EventEmitter,
	OnInit,
	Output
} from '@angular/core';

/**
 * Event that fires on element load.
 */
@Directive({
	/* eslint-disable-next-line @angular-eslint/directive-selector */
	selector: '[init]'
})
export class InitDirective implements OnInit {
	/** Init event. */
	@Output() public readonly init = new EventEmitter<
		HTMLElement | undefined
	>();

	/** @inheritDoc */
	public ngOnInit () : void {
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
