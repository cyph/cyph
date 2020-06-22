import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {
	AgendaService,
	DayService,
	DragAndDropService,
	MonthService,
	ResizeService,
	WeekService,
	WorkWeekService
} from '@syncfusion/ej2-angular-schedule';
import {Internationalization} from '@syncfusion/ej2-base';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {getDateTimeString} from '../../util/time';
import {openWindow} from '../../util/window';

/**
 * Angular component for account appointment agenda/scheduler.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		AgendaService,
		DayService,
		DragAndDropService,
		MonthService,
		ResizeService,
		WeekService,
		WorkWeekService
	],
	selector: 'cyph-account-appointment-agenda',
	styleUrls: ['./account-appointment-agenda.component.scss'],
	templateUrl: './account-appointment-agenda.component.html'
})
export class AccountAppointmentAgendaComponent extends BaseProvider
	implements OnInit {
	/** @ignore */
	private readonly internationalization = new Internationalization();

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** Formats date as string. */
	public readonly getTimeString = memoize((date: Date) : string =>
		this.internationalization.formatDate(date, {skeleton: 'hm'})
	);

	/** @see openWindow */
	public readonly openWindow = openWindow;

	/** @see ScheduleComponent.selectedDate */
	public selectedDate: Date = new Date();

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	constructor (
		/** @see Router */
		public readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see WindowWatcherService */
		public readonly windowWatcherService: WindowWatcherService
	) {
		super();
	}
}
