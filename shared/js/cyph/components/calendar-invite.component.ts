/* tslint:disable:member-ordering */

import {Component, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ICalendarInvite} from '../proto';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {getDate, timestampToDate} from '../util/time';


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
	/** Indicates whether input is disabled. */
	@Input() public isDisabled: boolean						= false;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean							= this.envService.isMobile;

	/** Current date. */
	public readonly now: Promise<Date>						= getDate();

	/** Change event callback. */
	public onChange: (value: ICalendarInvite) => void		= () => {};

	/** Touch event callback. */
	public onTouched: () => void							= () => {};

	/** @see timestampToDate */
	public readonly timestampToDate: typeof timestampToDate	= timestampToDate;

	/** Value. */
	public value: ICalendarInvite							= {};

	/** @inheritDoc */
	public registerOnChange (f: (value: ICalendarInvite) => void) : void {
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
	public writeValue (value?: ICalendarInvite) : void {
		if (value && this.value !== value) {
			this.value	= value;
		}
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
