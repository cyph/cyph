import {Frequency as RRuleFrequencies, RRule} from 'rrule';
import {DaysOfWeek, Frequencies, ICalendarRecurrenceRules} from '../proto';
import {timestampToDate} from './time';

const rruleWeekDayConvert = (n: number) =>
	n === RRule.SU.weekday ?
		DaysOfWeek.Sunday :
	n === RRule.MO.weekday ?
		DaysOfWeek.Monday :
	n === RRule.TU.weekday ?
		DaysOfWeek.Tuesday :
	n === RRule.WE.weekday ?
		DaysOfWeek.Wednesday :
	n === RRule.TH.weekday ?
		DaysOfWeek.Thursday :
	n === RRule.FR.weekday ?
		DaysOfWeek.Friday :
		DaysOfWeek.Saturday;

const rruleWeekDayRevert = (dayOfWeek: DaysOfWeek) =>
	dayOfWeek === DaysOfWeek.Sunday ?
		RRule.SU.weekday :
	dayOfWeek === DaysOfWeek.Monday ?
		RRule.MO.weekday :
	dayOfWeek === DaysOfWeek.Tuesday ?
		RRule.TU.weekday :
	dayOfWeek === DaysOfWeek.Wednesday ?
		RRule.WE.weekday :
	dayOfWeek === DaysOfWeek.Thursday ?
		RRule.TH.weekday :
	dayOfWeek === DaysOfWeek.Friday ?
		RRule.FR.weekday :
		RRule.SA.weekday;

/** Converts recurrence rule string to RecurrenceRules proto object. */
export const parseRecurrenceRule = (
	recurrenceRuleString: string,
	excludeDatesString?: string
) : ICalendarRecurrenceRules | undefined => {
	if (!recurrenceRuleString) {
		return;
	}

	if (!excludeDatesString) {
		excludeDatesString = '';
	}

	const rrule = RRule.fromString(
		recurrenceRuleString.replace(/[^;=]+=(;|$)/g, '').replace(/;$/, '')
	).options;

	const excludeDates = excludeDatesString
		.split(',')
		.filter(s => s)
		.map(s =>
			new Date(
				s.replace(
					/^(\d+)(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/,
					(_, year, month, day, hour, minute, second) =>
						`${year}-${month}-${day} ${hour}:${minute}:${second}Z`
				)
			).getTime()
		);

	return {
		byMonth: rrule.bymonth || [],
		byMonthDay: rrule.bymonthday || [],
		bySetPosition: rrule.bysetpos || [],
		byWeekDay: (rrule.byweekday || []).map(rruleWeekDayConvert),
		count: rrule.count || undefined,
		excludeDates,
		frequency:
			rrule.freq === RRuleFrequencies.YEARLY ?
				Frequencies.Yearly :
			rrule.freq === RRuleFrequencies.MONTHLY ?
				Frequencies.Monthly :
			rrule.freq === RRuleFrequencies.WEEKLY ?
				Frequencies.Weekly :
			rrule.freq === RRuleFrequencies.DAILY ?
				Frequencies.Daily :
			rrule.freq === RRuleFrequencies.HOURLY ?
				Frequencies.Hourly :
			rrule.freq === RRuleFrequencies.MINUTELY ?
				Frequencies.Minutely :
				Frequencies.Secondly,
		interval: rrule.interval,
		until: rrule.until ? rrule.until.getTime() : undefined,
		weekStart: 0
	};
};

/** Converts RecurrenceRules proto object to string of date exclusions. */
export const serializeRecurrenceExclusions = (
	recurrenceRule?: ICalendarRecurrenceRules
) : string =>
	recurrenceRule?.excludeDates && recurrenceRule.excludeDates.length > 0 ?
		recurrenceRule.excludeDates
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			.map(timestamp => timestampToDate(timestamp))
			.map(
				d =>
					`${d.getUTCFullYear()}${`0${d.getUTCMonth() + 1}`.slice(
						-2
					)}${`0${d.getUTCDate()}`.slice(
						-2
					)}T${`0${d.getUTCHours()}`.slice(
						-2
					)}${`0${d.getUTCMinutes()}`.slice(
						-2
					)}${`0${d.getUTCSeconds()}`.slice(-2)}Z`
			)
			.join(',') :
		'';

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
				recurrenceRule.frequency === Frequencies.Yearly ?
					RRuleFrequencies.YEARLY :
				recurrenceRule.frequency === Frequencies.Monthly ?
					RRuleFrequencies.MONTHLY :
				recurrenceRule.frequency === Frequencies.Weekly ?
					RRuleFrequencies.WEEKLY :
				recurrenceRule.frequency === Frequencies.Daily ?
					RRuleFrequencies.DAILY :
				recurrenceRule.frequency === Frequencies.Hourly ?
					RRuleFrequencies.HOURLY :
				recurrenceRule.frequency === Frequencies.Minutely ?
					RRuleFrequencies.MINUTELY :
					RRuleFrequencies.SECONDLY,
			interval: recurrenceRule.interval,
			until: recurrenceRule.until ?
				new Date(recurrenceRule.until) :
				undefined,
			wkst: recurrenceRule.weekStart ?
				rruleWeekDayRevert(recurrenceRule.weekStart) :
				undefined
		}).replace(/^RRULE:/, '') :
		'';
