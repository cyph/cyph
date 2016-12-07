import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {Util} from '../../util';


/**
 * Angular component for taking file input.
 */
@Component({
	selector: 'cyph-file-input',
	templateUrl: '../../../../templates/fileinput.html'
})
export class FileInput {
	/** @ignore */
	@Input() public accept: string;

	/** @ignore */
	@Output() public change: EventEmitter<File>	= new EventEmitter<File>();

	constructor (elementRef: ElementRef) { (async () => {
		let $input: JQuery;
		while (!$input || $input.length < 1) {
			$input	= $(elementRef.nativeElement).children();
			await Util.sleep();
		}

		const input	= <HTMLInputElement> $input[0];

		$input.
			change(e => {
				e.stopPropagation();
				e.preventDefault();

				if (input.files.length < 1 || !this.change) {
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

		let $button: JQuery;
		while (!$button || $button.length < 1) {
			$button	= $input.closest('button');
			await Util.sleep();
		}

		$button.click(() => Util.triggerClick(input));
	})(); }
}
