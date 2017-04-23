import {Component, ElementRef, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as $ from 'jquery';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for taking file input.
 */
@Component({
	selector: 'cyph-file-input',
	styleUrls: ['../../css/components/file-input.css'],
	templateUrl: '../../templates/file-input.html'
})
export class FileInputComponent implements OnInit {
	/** Optional file type restriction. */
	@Input() public accept: string;

	/** Handler for uploaded files. */
	@Output() public change: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $input	= await util.waitForIterable(
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
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
