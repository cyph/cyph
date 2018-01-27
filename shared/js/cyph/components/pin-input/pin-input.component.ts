import {Component, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import * as $ from 'jquery';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for PIN input UI.
 */
@Component({
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: PinInputComponent
		}
	],
	selector: 'cyph-pin-input',
	styleUrls: ['./pin-input.component.scss'],
	templateUrl: './pin-input.component.html'
})
export class PinInputComponent implements ControlValueAccessor {
	/** Change event callback. */
	private onChange?: (s: string) => void;

	/** @ignore */
	private valueInternal: string		= '';

	/** Indicates whether input is disabled. */
	public isDisabled: boolean			= false;

	/** PIN text mask. */
	public readonly mask: any			= {
		mask: [/\d/, ' ', ' ', /\d/, ' ', ' ', /\d/, ' ', ' ', /\d/],
		placeholderChar: '_',
		showMask: true
	};

	/** Form name. */
	@Input() public name: string		= '';

	/** Touch event callback. */
	public onTouched?: () => void;

	/** Indicates whether input is required. */
	@Input() public required: boolean	= false;

	/** @ignore */
	private get valueExternal () : string {
		return this.valueInternal.replace(/[^\d]/g, '');
	}

	/** Focuses PIN input. */
	public async focusPIN (e: MouseEvent) : Promise<void> {
		/* x3 to account for spaces in pinMask */
		const index	= this.valueExternal.length * 3;

		const $elem	= $(e.target).find('input');
		const elem	= <HTMLInputElement> $elem[0];

		$elem.trigger('focus');
		elem.setSelectionRange(index, index);
	}

	/** @inheritDoc */
	public registerOnChange (f: (s: string) => void) : void {
		this.onChange	= f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched	= f;
	}

	/** @inheritDoc */
	public setDisabledState (b: boolean) : void {
		if (this.isDisabled !== b) {
			this.isDisabled	= b;
		}
	}

	/** PIN value. */
	public get value () : string {
		return this.valueInternal;
	}

	/** @ignore */
	public set value (s: string) {
		if (this.valueInternal === s) {
			return;
		}

		this.valueInternal	= s;

		if (this.onChange) {
			this.onChange(this.valueExternal);
		}
	}

	/** @inheritDoc */
	public writeValue (s: string) : void {
		if (this.valueInternal !== s) {
			this.valueInternal	= s;
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
