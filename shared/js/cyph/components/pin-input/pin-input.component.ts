import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {EnvService} from '../../services/env.service';
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
export class PinInputComponent implements ControlValueAccessor, OnInit {
	/** Change event callback. */
	private onChange?: (s: string) => void;

	/** Hide PIN. */
	@Input() public hide: boolean					= true;

	/** Indicates whether input is disabled. */
	public isDisabled: boolean						= false;

	/** Input. */
	@ViewChild('pinInput') public pinInput?: ElementRef;

	/** Form name. */
	@Input() public name: string					= '';

	/** Touch event callback. */
	public onTouched?: () => void;

	/** Removes extraneous characters from value. */
	public readonly processValue					= memoize((value?: string|number) =>
		value ? value.toString().replace(/[^\d]/g, '').slice(0, 4) : ''
	);

	/** Indicates whether input is required. */
	@Input() public required: boolean				= false;

	/** PIN value. */
	public readonly value: BehaviorSubject<string>	= new BehaviorSubject('');

	/** @inheritDoc */
	public ngOnInit () : void {
		this.value.subscribe(s => {
			s	= (s || '').trim();

			if (this.onChange) {
				this.onChange(s);
			}

			if (this.pinInput && this.pinInput.nativeElement) {
				const input	= <HTMLInputElement> this.pinInput.nativeElement;
				input.value	= '';
				input.value	= s;
			}
		});
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

	/** @inheritDoc */
	public writeValue (s: string) : void {
		if (this.value.value !== s) {
			this.value.next(s);
		}
	}

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
