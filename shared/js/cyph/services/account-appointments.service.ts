import {Injectable} from '@angular/core';
import {EventSettingsModel} from '@syncfusion/ej2-angular-schedule';
import memoize from 'lodash-es/memoize';
import {Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {AppointmentSharing} from '../calendar';
import {
	BurnerSession,
	CallTypes,
	IAccountFileRecord,
	IAppointment,
	IBurnerSession,
	ICalendarInvite
} from '../../proto';
import {filterUndefined} from '../util/filter';
import {observableAll} from '../util/observable-all';
import {watchTimestamp} from '../util/time';
import {AccountFilesService} from './account-files.service';
import {AccountSettingsService} from './account-settings.service';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';

/**
 * Account appointments service.
 */
@Injectable()
export class AccountAppointmentsService extends BaseProvider {
	/** Time in ms when user can check in - also used as cuttoff point for end time. */
	private readonly appointmentGracePeriod = 600000;

	/** Gets appointment. */
	private readonly getAppointment = memoize(
		(
			record: IAccountFileRecord
		) : Observable<
			| {
					appointment: IAppointment;
					friend?: string;
					schedulerObject: {
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						Description: string;
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						EndTime: Date;
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						Id: number;
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						Location: string;
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						StartTime: Date;
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						Subject: string;
					};
			  }
			| undefined
		> =>
			this.accountFilesService.watchAppointment(record).pipe(
				map(appointment => {
					const currentUser = this.accountDatabaseService.currentUser
						.value;

					if (!currentUser) {
						return;
					}

					const friend = (appointment.participants || []).filter(
						participant => participant !== currentUser.user.username
					)[0];

					return {
						appointment,
						friend,
						schedulerObject: {
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							Description: appointment.calendarInvite.title,
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							EndTime: new Date(
								appointment.calendarInvite.endTime
							),
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							Id: ++this.lastAppointmentID,
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							Location: appointment.calendarInvite.url || '',
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							StartTime: new Date(
								appointment.calendarInvite.startTime
							),
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							Subject: appointment.fromName || ''
						}
					};
				})
			),
		(record: IAccountFileRecord) => record.id
	);

	/** Last appointment ID for `EventSettingsModel`. */
	private lastAppointmentID: number = 0;

	/** All (unfiltered) appointments. */
	public readonly allAppointments = this.getAppointments(
		this.accountFilesService.filesListFiltered.appointments
	);

	/**
	 * Appointment lists.
	 *
	 * `current`: Ongoing appointments, taking into account grace period.
	 * `future`: Future appointments, taking into account grace period.
	 * `past`: Appointments that have already occurred or passed the grace period.
	 * `upcoming`: Next five ongoing or future appointments.
	 */
	public readonly appointments = {
		current: observableAll([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						!appointment.occurred &&
						now + this.appointmentGracePeriod >=
							appointment.calendarInvite.startTime &&
						now - this.appointmentGracePeriod <=
							appointment.calendarInvite.endTime
				)
			)
		),
		future: observableAll([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						!appointment.occurred &&
						now + this.appointmentGracePeriod <
							appointment.calendarInvite.startTime
				)
			)
		),
		incoming: this.getAppointments(
			this.accountFilesService.incomingFilesFiltered.appointments
		),
		past: observableAll([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments.filter(
					({appointment}) =>
						appointment.occurred ||
						now - this.appointmentGracePeriod >
							appointment.calendarInvite.endTime
				)
			)
		),
		upcoming: observableAll([this.allAppointments, watchTimestamp()]).pipe(
			map(([appointments, now]) =>
				appointments
					.filter(
						({appointment}) =>
							!appointment.occurred &&
							now < appointment.calendarInvite.endTime
					)
					.sort(
						(a, b) =>
							a.appointment.calendarInvite.startTime -
							b.appointment.calendarInvite.startTime
					)
					.slice(0, 5)
			)
		)
	};

	/** `appointments` converted into `EventSettingsModel` objects. */
	public readonly appointmentSchedulerModels = {
		all: this.allAppointments.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		),
		current: this.appointments.current.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		),
		future: this.appointments.future.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		),
		incoming: this.appointments.incoming.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		),
		past: this.appointments.past.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		),
		upcoming: this.appointments.upcoming.pipe(
			map(
				(appointments) : EventSettingsModel => ({
					dataSource: appointments.map(o => o.schedulerObject)
				})
			)
		)
	};

	/** List of email contacts from all appointments. */
	public readonly pastEmailContacts = this.allAppointments.pipe(
		map(appointments =>
			Object.entries(
				appointments
					.map(({appointment}) => ({
						email: (appointment.fromEmail || '')
							.trim()
							.toLowerCase(),
						name: (appointment.fromName || '').trim()
					}))
					.filter(({email}) => email)
					.reduce<Record<string, string>>(
						(o, {email, name}) => ({...o, [email]: name}),
						{}
					)
			).map(([email, name]) => ({email, name}))
		)
	);

	/** @ignore */
	private getAppointments (
		recordsList: Observable<IAccountFileRecord[]>
	) : Observable<
		{
			appointment: IAppointment;
			friend?: string;
			record: IAccountFileRecord;
			schedulerObject: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Description: string;
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EndTime: Date;
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Id: number;
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Location: string;
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				StartTime: Date;
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Subject: string;
			};
		}[]
	> {
		return recordsList.pipe(
			switchMap(records =>
				observableAll(
					records
						.map(record =>
							this.getAppointment(record).pipe(
								map(appointment =>
									appointment ?
										{
											id: record.id,
											record,
											...appointment
										} :
										undefined
								)
							)
						)
						.concat(
							/* Workaround for it not emitting when recordsList changes */
							of(undefined)
						)
				)
			),
			map(filterUndefined)
		);
	}

	/** Sends appointment invite. */
	public async invite (
		calendarInvite: ICalendarInvite,
		appointmentSharing: AppointmentSharing,
		burnerSession?: IBurnerSession
	) : Promise<void> {
		if (
			!(await this.accountSettingsService.staticFeatureFlags.scheduler
				.pipe(take(1))
				.toPromise())
		) {
			return;
		}

		if (!calendarInvite.uid) {
			throw new Error('No calendar event UID.');
		}

		if (!burnerSession) {
			burnerSession = await this.accountDatabaseService.getItem(
				`burnerSessions/${calendarInvite.uid}`,
				BurnerSession
			);
		}

		if (!burnerSession.members || burnerSession.members.length < 1) {
			throw new Error('No guests.');
		}

		this.accountDatabaseService.callFunction('appointmentInvite', {
			accountBurnerID: calendarInvite.uid,
			callType:
				calendarInvite.callType === CallTypes.Audio ?
					'audio' :
				calendarInvite.callType === CallTypes.Video ?
					'video' :
					undefined,
			eventDetails: {
				endTime: calendarInvite.endTime,
				startTime: calendarInvite.startTime,
				uid: calendarInvite.uid
			},
			inviterTimeZone: appointmentSharing.inviterTimeZone.value ?
				Intl.DateTimeFormat().resolvedOptions().timeZone :
				undefined,
			shareMemberContactInfo: appointmentSharing.memberContactInfo.value,
			shareMemberList: appointmentSharing.memberList.value,
			telehealth: this.configService.planConfig[
				await this.accountSettingsService.plan.pipe(take(1)).toPromise()
			].telehealth,
			to: {
				members: burnerSession.members
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		private readonly configService: ConfigService
	) {
		super();
	}
}
