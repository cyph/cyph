import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {triggerClick} from '../util/trigger-click';
import {waitForIterable} from '../util/wait';


/**
 * Angular component for taking file input.
 */
@Component({
	selector: 'cyph-file-input',
	styleUrls: ['../../../css/components/file-input.scss'],
	templateUrl: '../../../templates/file-input.html'
})
export class FileInputComponent implements AfterViewInit {
	/** Optional file type restriction. */
	@Input() public accept?: string;

	/** Handler for uploaded files. */
	@Output() public fileChange: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $input	= await waitForIterable(
			() => $(this.elementRef.nativeElement).children()
		);

		const input		= <HTMLInputElement> $input[0];

		$input.
			change(e => {
				e.stopPropagation();
				e.preventDefault();

				if (!input.files || input.files.length < 1) {
					return;
				}

				this.fileChange.emit(input.files[0]);
				$input.val('');
			}).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			})
		;

		const $button	= await waitForIterable(
			() => $input.closest('button')
		);

		$button.click(() => { triggerClick(input); });
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
