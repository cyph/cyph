import {Component} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for calendar invite UI.
 */
@Component({
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: CalendarInviteComponent
		}
	],
	selector: 'cyph-calendar-invite',
	styleUrls: ['../../../css/components/calendar-invite.scss'],
	templateUrl: '../../../templates/calendar-invite.html'
})
export class CalendarInviteComponent implements ControlValueAccessor {
	/** Change event callback. */
	private onChange: (value: string) => void	= () => {};

	/** Indicates whether input is disabled. */
	public isDisabled: boolean					= false;

	/** Touch event callback. */
	public onTouched: () => void				= () => {};

	/** Value. */
	public value: string						= '';

	/** @inheritDoc */
	public registerOnChange (f: (value: string) => void) : void {
		this.onChange	= f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched	= f;
	}

	/** @inheritDoc */
	public setDisabledState (isDisabled: boolean) : void {
		if (this.isDisabled !== isDisabled) {
			this.isDisabled	= isDisabled;
		}
	}

	/** @inheritDoc */
	public writeValue (value: string) : void {
		if (this.value !== value) {
			this.value	= value;
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
