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
	@Output() public fileChange: EventEmitter<File>	= new EventEmitter<File>();

	constructor (elementRef: ElementRef) {
		const $input	= $(elementRef.nativeElement).children();
		const input		= <HTMLInputElement> $input[0];

		$input.
			change(() => {
				if (input.files.length < 1 || !this.fileChange) {
					return;
				}

				this.fileChange.emit(input.files[0]);
				$input.val('');
			}).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			}).
			parent().parent().click(() =>
				Util.triggerClick(input)
			)
		;
	}
}
