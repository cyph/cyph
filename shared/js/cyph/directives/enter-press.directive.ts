import {Directive, ElementRef, EventEmitter, OnInit, Output} from '@angular/core';
import * as $ from 'jquery';
import {BaseProvider} from '../base-provider';


/** Fires event on enter press. */
@Directive({
	selector: '[cyphEnterPress]'
})
export class EnterPressDirective extends BaseProvider implements OnInit {
	/** Enter press event emitter. */
	@Output() public readonly cyphEnterPress: EventEmitter<void>	= new EventEmitter<void>();

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		$(this.elementRef.nativeElement).on('keypress', e => {
			if (e.keyCode !== 13) {
				return;
			}

			e.preventDefault();
			this.cyphEnterPress.emit();
		});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef
	) {
		super();
	}
}
