import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {ITimeRange} from '../../itime-range';
import {CalendarInvite, CallTypes, ICalendarInvite} from '../../proto';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {
	getDate,
	getDurationString,
	getTimes,
	getTimestamp,
	timestampTo24HourTimeString,
	timestampToDate,
	timestampToTime,
	timestampUpdate,
	timeToString
} from '../../util/time';
import {translate} from '../../util/translate';


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
	styleUrls: ['./calendar-invite.component.scss'],
	templateUrl: './calendar-invite.component.html'
})
export class CalendarInviteComponent implements ControlValueAccessor, OnChanges, OnInit {
	/** @see CallTypes */
	public readonly callTypes: typeof CallTypes						= CallTypes;

	/** Date filter to prevent forbidden days from being selected. */
	public readonly dateFilter										= (d: Date) : boolean =>
		this.forbiddenDays.indexOf(d.getDay()) < 0
	/* tslint:disable-next-line:semicolon */
	;

	/** @see CalendarInvite.DaysOfWeek */
	public readonly daysOfWeek: typeof CalendarInvite.DaysOfWeek	= CalendarInvite.DaysOfWeek;

	/** @see CalendarInvite.DaysOfWeek */
	public readonly dayOfWeekValues: CalendarInvite.DaysOfWeek[]	= [
		CalendarInvite.DaysOfWeek.Sunday,
		CalendarInvite.DaysOfWeek.Monday,
		CalendarInvite.DaysOfWeek.Tuesday,
		CalendarInvite.DaysOfWeek.Wednesday,
		CalendarInvite.DaysOfWeek.Thursday,
		CalendarInvite.DaysOfWeek.Friday,
		CalendarInvite.DaysOfWeek.Saturday
	];

	/** Duration (milliseconds). */
	@Input() public duration: number								= 1800000;

	/** List of possible durations (milliseconds). */
	@Input() public durations: number[]								= [1800000, 3600000];

	/** Defaults selection to a follow-up apointment. */
	@Input() public followUp: boolean								= false;

	/** Disallowed days of the week (Saturday and Sunday by default). */
	@Input() public forbiddenDays: CalendarInvite.DaysOfWeek[]		= [
		CalendarInvite.DaysOfWeek.Sunday,
		CalendarInvite.DaysOfWeek.Saturday
	];

	/** Returns a human-readable day abbreviation (e.g. "SUN"). */
	public readonly getDayString									= memoize(
		(day: CalendarInvite.DaysOfWeek) => translate(
			this.daysOfWeek[day].toUpperCase().slice(0, 3)
		)
	);

	/** @see getDurationString */
	public readonly getDurationString: typeof getDurationString		= getDurationString;

	/** Returns a human-readable time frame string (e.g. "Morning"). */
	public readonly getTimeFrameString								= memoize(
		(timeFrame: CalendarInvite.TimeFrames) => translate(
			CalendarInvite.TimeFrames[timeFrame]
		)
	);

	/** @see getTimes */
	public readonly getTimes: typeof getTimes						= getTimes;

	/** Indicates whether input is disabled. */
	@Input() public isDisabled: boolean								= false;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean									= this.envService.isMobile;

	/** Current date. */
	public readonly now: Promise<Date>								= getDate();

	/** Change event callback. */
	public onChange: (value: ICalendarInvite) => void				= () => {};

	/** Touch event callback. */
	public onTouched: () => void									= () => {};

	/** List of possible reasons for this invite. */
	@Input() public reasons?: string[];

	/** @see CalendarInvite.TimeFrames */
	public readonly timeFrames: typeof CalendarInvite.TimeFrames	= CalendarInvite.TimeFrames;

	/** @see CalendarInvite.DaysOfWeek */
	public readonly timeFrameValues: CalendarInvite.TimeFrames[]	= [
		CalendarInvite.TimeFrames.Morning,
		CalendarInvite.TimeFrames.Afternoon,
		CalendarInvite.TimeFrames.Evening
	];

	/** Number of minutes in between times. */
	@Input() public timeIncrement: number							= 30;

	/** List of possible reasons for this invite. */
	@Input() public timeRange: ITimeRange							= {
		end: {hour: 17, minute: 0},
		start: {hour: 9, minute: 0}
	};

	/** @see timestampTo24HourTimeString */
	public readonly timestampTo24HourTimeString: typeof timestampTo24HourTimeString	=
		timestampTo24HourTimeString
	;

	/** @see timestampToDate */
	public readonly timestampToDate: typeof timestampToDate			= timestampToDate;

	/** @see timestampToTime */
	public readonly timestampToTime: typeof timestampToTime			= timestampToTime;

	/** @see timestampUpdate */
	public readonly timestampUpdate: typeof timestampUpdate			= timestampUpdate;

	/** @see timeToString */
	public readonly timeToString: typeof timeToString				= timeToString;

	/** @see trackBySelf */
	public trackBySelf: typeof trackBySelf							= trackBySelf;

	/** Value. */
	public readonly valueSubject: BehaviorSubject<ICalendarInvite|undefined>	=
		new BehaviorSubject<ICalendarInvite|undefined>(undefined)
	;

	/** Default appointment reason dropdown selection. */
	public get defaultReasonForAppointment () : string|undefined {
		return this.followUp ? this.stringsService.followUpNoun : undefined;
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (this.valueSubject.value && !this.valueSubject.value.title) {
			this.valueSubject.next({
				...this.valueSubject.value,
				title: this.defaultReasonForAppointment
			});
		}

		if (!this.followUp) {
			return;
		}

		if (!this.reasons) {
			this.reasons	= [this.stringsService.followUpNoun];
		}
		else if (this.reasons.indexOf(this.stringsService.followUpNoun) < 0) {
			this.reasons	= [this.stringsService.followUpNoun].concat(this.reasons);
		}
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const timestamp	= await getTimestamp();

		if (this.valueSubject.value === undefined) {
			this.valueSubject.next({
				alternateDays: {},
				alternateTimeFrames: {},
				description: '',
				endTime: timestamp + this.duration,
				startTime: timestamp,
				title: this.defaultReasonForAppointment
			});
		}
	}

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

	/** Disable all validation and set appointment to now. Local environments only. */
	public async setNow () : Promise<void> {
		if (!this.envService.environment.local) {
			return;
		}

		const timestamp	= new Date(await getTimestamp()).setMinutes(0);

		this.duration		= 3600000;
		this.forbiddenDays	= [];
		this.timeRange		= {
			end: {hour: 24, minute: 0},
			start: {hour: 0, minute: 0}
		};

		if (this.durations.indexOf(this.duration) < 0) {
			this.durations.push(this.duration);
		}

		this.valueSubject.next({
			...this.valueSubject.value,
			endTime: timestamp + this.duration,
			startTime: timestamp
		});
	}

	/** @inheritDoc */
	public writeValue (value?: ICalendarInvite) : void {
		if (value && this.valueSubject.value !== value) {
			this.valueSubject.next(value);
		}
	}

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
