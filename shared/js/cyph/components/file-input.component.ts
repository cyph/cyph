import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {util} from '../util';


/**
 * Angular component for taking file input.
 */
@Component({
	selector: 'cyph-file-input',
	templateUrl: '../../../templates/file-input.html'
})
export class FileInputComponent {
	/** Optional file type restriction. */
	@Input() public accept: string;

	/** Handler for uploaded files. */
	@Output() public change: EventEmitter<File>	= new EventEmitter<File>();

	constructor (elementRef: ElementRef) { (async () => {
		const $input	= await util.waitForIterable(
			() => $(elementRef.nativeElement).children()
		);

		const input	= <HTMLInputElement> $input[0];

		$input.
			change(e => {
				e.stopPropagation();
				e.preventDefault();

				if (!input.files || input.files.length < 1) {
					return;
				}

				this.change.emit(input.files[0]);
				$input.val('');
			}).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			})
		;

		const $button	= await util.waitForIterable(
			() => $input.closest('button')
		);

		$button.click(() => { util.triggerClick(input); });
	})(); }
}
