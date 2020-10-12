import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {RecurrenceEditorChangeEventArgs} from '@syncfusion/ej2-angular-schedule';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AppointmentSharing} from '../../calendar';
import {ITimeRange} from '../../itime-range';
import {CalendarInvite, CallTypes, ICalendarInvite} from '../../proto';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {
	getDate,
	getDurationString,
	getStartPadding,
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
	changeDetection: ChangeDetectionStrategy.OnPush,
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
export class CalendarInviteComponent extends BaseProvider
	implements ControlValueAccessor, OnChanges, OnInit {
	/** @see AppointmentSharing */
	@Input() public appointmentSharing = new AppointmentSharing();

	/** @see AppointmentSharing */
	@Output() public readonly appointmentSharingChange = new EventEmitter<
		AppointmentSharing
	>();

	/** Value. */
	public readonly calendarInvite = new BehaviorSubject<
		ICalendarInvite | undefined
	>(undefined);

	/** @see CallTypes */
	public readonly callTypes = CallTypes;

	/** Current date. */
	public readonly currentDate: BehaviorSubject<
		Date | undefined
	> = new BehaviorSubject<Date | undefined>(undefined);

	/** @see CalendarInvite.DaysOfWeek */
	public readonly daysOfWeek = CalendarInvite.DaysOfWeek;

	/** @see CalendarInvite.DaysOfWeek */
	public readonly dayOfWeekValues: CalendarInvite.DaysOfWeek[] = [
		CalendarInvite.DaysOfWeek.Sunday,
		CalendarInvite.DaysOfWeek.Monday,
		CalendarInvite.DaysOfWeek.Tuesday,
		CalendarInvite.DaysOfWeek.Wednesday,
		CalendarInvite.DaysOfWeek.Thursday,
		CalendarInvite.DaysOfWeek.Friday,
		CalendarInvite.DaysOfWeek.Saturday
	];

	/** Duration (milliseconds). */
	@Input() public duration: number = 1800000;

	/** List of possible durations (milliseconds). */
	@Input() public durations: number[] = [1800000, 3600000];

	/** Defaults selection to a follow-up apointment. */
	@Input() public followUp: boolean = false;

	/** Disallowed days of the week (Saturday and Sunday by default). */
	@Input() public forbiddenDays: CalendarInvite.DaysOfWeek[] = [
		CalendarInvite.DaysOfWeek.Sunday,
		CalendarInvite.DaysOfWeek.Saturday
	];

	/** Returns a human-readable day abbreviation (e.g. "SUN"). */
	public readonly getDayString = memoize((day: CalendarInvite.DaysOfWeek) =>
		translate(this.daysOfWeek[day].toUpperCase().slice(0, 3))
	);

	/** @see getDurationString */
	public readonly getDurationString = getDurationString;

	/** @see getStartPadding */
	public readonly getStartPadding = getStartPadding;

	/** Returns a human-readable time frame string (e.g. "Morning"). */
	public readonly getTimeFrameString = memoize(
		(timeFrame: CalendarInvite.TimeFrames) =>
			translate(CalendarInvite.TimeFrames[timeFrame])
	);

	/** @see getTimes */
	public readonly getTimes = getTimes;

	/** Indicates whether input is disabled. */
	@Input() public isDisabled: boolean = false;

	/** isDisabled wrapper for ControlValueAccessor. */
	public readonly isDisabledWrapper = new BehaviorSubject<boolean>(false);

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean = this.envService.isMobile.value;

	/** List of possible reasons for this invite. */
	@Input() public reasons?: string[];

	/** @see CalendarInvite.TimeFrames */
	public readonly timeFrames = CalendarInvite.TimeFrames;

	/** @see CalendarInvite.DaysOfWeek */
	public readonly timeFrameValues: CalendarInvite.TimeFrames[] = [
		CalendarInvite.TimeFrames.Morning,
		CalendarInvite.TimeFrames.Afternoon,
		CalendarInvite.TimeFrames.Evening
	];

	/** Number of minutes in between times. */
	@Input() public timeIncrement: number = 30;

	/** List of possible reasons for this invite. */
	@Input() public timeRange: ITimeRange = {
		end: {hour: 24, minute: 0},
		start: {hour: 0, minute: 0}
	};

	/** @see timestampTo24HourTimeString */
	public readonly timestampTo24HourTimeString = timestampTo24HourTimeString;

	/** @see timestampToDate */
	public readonly timestampToDate = timestampToDate;

	/** @see timestampToTime */
	public readonly timestampToTime = timestampToTime;

	/** @see timestampUpdate */
	public readonly timestampUpdate = timestampUpdate;

	/** @see timeToString */
	public readonly timeToString = timeToString;

	/** Tomorrow's date. */
	public readonly tomorrow: Promise<Date> = getTimestamp().then(timestamp =>
		timestampToDate(timestamp + 86400000)
	);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Date filter to prevent forbidden days from being selected. */
	/* eslint-disable-next-line no-null/no-null */
	public readonly dateFilter = (d?: Date | null) : boolean =>
		d instanceof Date && this.forbiddenDays.indexOf(d.getDay()) < 0;

	/** Default appointment reason dropdown selection. */
	public get defaultReasonForAppointment () : string {
		return this.followUp ?
			this.stringsService.followUpNoun :
			this.stringsService.reasonForAppointmentDefault;
	}

	/** Change event callback. */
	public onChange: (value: ICalendarInvite) => void = () => {};

	/** Touch event callback. */
	public onTouched: () => void = () => {};

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (this.isDisabledWrapper.value !== this.isDisabled) {
			this.isDisabledWrapper.next(this.isDisabled);
		}

		if (this.calendarInvite.value && !this.calendarInvite.value.title) {
			this.calendarInvite.next({
				...this.calendarInvite.value,
				title: this.defaultReasonForAppointment
			});
		}

		if (!this.followUp) {
			return;
		}

		if (!this.reasons) {
			this.reasons = [this.stringsService.followUpNoun];
		}
		else if (this.reasons.indexOf(this.stringsService.followUpNoun) < 0) {
			this.reasons = [this.stringsService.followUpNoun].concat(
				this.reasons
			);
		}
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		const now = await getDate();

		this.currentDate.next(now);

		/* Two weeks from this Monday. */
		const timestamp =
			now.getTime() + (1 - now.getDay()) * 86400000 + 1209600000;

		if (this.calendarInvite.value !== undefined) {
			return;
		}

		this.calendarInvite.next({
			alternateDays: {},
			alternateTimeFrames: {},
			callType: CallTypes.Video,
			description: '',
			endTime: timestamp + this.duration,
			startTime: timestamp,
			title: this.defaultReasonForAppointment
		});
	}

	/** @inheritDoc */
	public registerOnChange (f: (value: ICalendarInvite) => void) : void {
		this.onChange = f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched = f;
	}

	/** @inheritDoc */
	public setDisabledState (b: boolean) : void {
		if (this.isDisabledWrapper.value !== b) {
			this.isDisabledWrapper.next(b);
		}
	}

	/** Disable all validation and set appointment to now. Local environments only. */
	public async setNow () : Promise<void> {
		if (!this.envService.debug || !this.calendarInvite.value) {
			return;
		}

		const timestamp = new Date(await getTimestamp()).setMinutes(0);

		this.currentDate.next(timestampToDate(timestamp - 172800000));

		const duration = 14400000;
		this.forbiddenDays = [];
		this.timeRange = {
			end: {hour: 24, minute: 0},
			start: {hour: 0, minute: 0}
		};

		if (this.durations.indexOf(duration) < 0) {
			this.durations.push(duration);
		}

		this.duration = duration;

		this.valueChange({
			...this.calendarInvite.value,
			endTime: timestamp + duration / 2,
			startTime: timestamp - duration / 2
		});

		this.changeDetectorRef.markForCheck();
	}

	/** Handles recurrence change. */
	public setRecurrence (recurrence: RecurrenceEditorChangeEventArgs) : void {
		throw new Error(`TODO: Set recurrence "${recurrence.value}"`);
	}

	/** Handle value change. */
	public valueChange (value: ICalendarInvite | undefined) : void {
		if (value === undefined) {
			return;
		}

		this.calendarInvite.next(value);
		this.onChange(value);
	}

	/** @inheritDoc */
	public writeValue (value?: ICalendarInvite) : void {
		if (value && this.calendarInvite.value !== value) {
			this.calendarInvite.next(value);
		}
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
