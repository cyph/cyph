import {Frequency, RRule} from 'rrule';
import {
	CalendarInvite,
	CalendarRecurrenceRules,
	ICalendarRecurrenceRules
} from '../proto';

const rruleWeekDayConvert = (n: number) =>
	n === RRule.SU.weekday ?
		CalendarInvite.DaysOfWeek.Sunday :
	n === RRule.MO.weekday ?
		CalendarInvite.DaysOfWeek.Monday :
	n === RRule.TU.weekday ?
		CalendarInvite.DaysOfWeek.Tuesday :
	n === RRule.WE.weekday ?
		CalendarInvite.DaysOfWeek.Wednesday :
	n === RRule.TH.weekday ?
		CalendarInvite.DaysOfWeek.Thursday :
	n === RRule.FR.weekday ?
		CalendarInvite.DaysOfWeek.Friday :
		CalendarInvite.DaysOfWeek.Saturday;

const rruleWeekDayRevert = (dayOfWeek: CalendarInvite.DaysOfWeek) =>
	dayOfWeek === CalendarInvite.DaysOfWeek.Sunday ?
		RRule.SU.weekday :
	dayOfWeek === CalendarInvite.DaysOfWeek.Monday ?
		RRule.MO.weekday :
	dayOfWeek === CalendarInvite.DaysOfWeek.Tuesday ?
		RRule.TU.weekday :
	dayOfWeek === CalendarInvite.DaysOfWeek.Wednesday ?
		RRule.WE.weekday :
	dayOfWeek === CalendarInvite.DaysOfWeek.Thursday ?
		RRule.TH.weekday :
	dayOfWeek === CalendarInvite.DaysOfWeek.Friday ?
		RRule.FR.weekday :
		RRule.SA.weekday;

/** Converts recurrence rule string to RecurrenceRules proto object. */
export const parseRecurrenceRule = (
	recurrenceRuleString: string
) : ICalendarRecurrenceRules | undefined => {
	if (!recurrenceRuleString) {
		return;
	}

	const rrule = RRule.fromString(
		recurrenceRuleString.replace(/[^;=]+=(;|$)/g, '').replace(/;$/, '')
	).options;

	return {
		byMonth: rrule.bymonth || [],
		byMonthDay: rrule.bymonthday || [],
		bySetPosition: rrule.bysetpos || [],
		byWeekDay: (rrule.byweekday || []).map(rruleWeekDayConvert),
		count: rrule.count || undefined,
		frequency:
			rrule.freq === Frequency.YEARLY ?
				CalendarRecurrenceRules.Frequency.Yearly :
			rrule.freq === Frequency.MONTHLY ?
				CalendarRecurrenceRules.Frequency.Monthly :
			rrule.freq === Frequency.WEEKLY ?
				CalendarRecurrenceRules.Frequency.Weekly :
			rrule.freq === Frequency.DAILY ?
				CalendarRecurrenceRules.Frequency.Daily :
			rrule.freq === Frequency.HOURLY ?
				CalendarRecurrenceRules.Frequency.Hourly :
			rrule.freq === Frequency.MINUTELY ?
				CalendarRecurrenceRules.Frequency.Minutely :
				CalendarRecurrenceRules.Frequency.Secondly,
		interval: rrule.interval,
		until: rrule.until ? rrule.until.getTime() : undefined,
		weekStart: rruleWeekDayConvert(rrule.wkst)
	};
};

/** Converts RecurrenceRules proto object to string. */
export const serializeRecurrenceRule = (
	recurrenceRule?: ICalendarRecurrenceRules
) : string =>
	recurrenceRule ?
		RRule.optionsToString({
			bymonth: recurrenceRule.byMonth,
			bymonthday: recurrenceRule.byMonthDay,
			bysetpos: recurrenceRule.bySetPosition,
			byweekday: (recurrenceRule.byWeekDay || []).map(rruleWeekDayRevert),
			count: recurrenceRule.count,
			freq:
				recurrenceRule.frequency ===
				CalendarRecurrenceRules.Frequency.Yearly ?
					Frequency.YEARLY :
				recurrenceRule.frequency ===
				CalendarRecurrenceRules.Frequency.Monthly ?
					Frequency.MONTHLY :
				recurrenceRule.frequency ===
				CalendarRecurrenceRules.Frequency.Weekly ?
					Frequency.WEEKLY :
				recurrenceRule.frequency ===
				CalendarRecurrenceRules.Frequency.Daily ?
					Frequency.DAILY :
				recurrenceRule.frequency ===
				CalendarRecurrenceRules.Frequency.Hourly ?
					Frequency.HOURLY :
				recurrenceRule.frequency ===
					CalendarRecurrenceRules.Frequency.Minutely ?
					Frequency.MINUTELY :
					Frequency.SECONDLY,
			interval: recurrenceRule.interval,
			until: recurrenceRule.until ?
				new Date(recurrenceRule.until) :
				undefined,
			wkst: recurrenceRule.weekStart ?
				rruleWeekDayRevert(recurrenceRule.weekStart) :
				undefined
		}).replace(/^RRULE:/, '') :
		'';
