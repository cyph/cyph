import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AccountFileRecord, IAccountFileRecord, IForm} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {toInt} from '../../util/formatting';
import {observableAll} from '../../util/observable-all';

/**
 * Angular component for an individual form.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-form',
	styleUrls: ['./account-form.component.scss'],
	templateUrl: './account-form.component.html'
})
export class AccountFormComponent extends BaseProvider implements OnInit {
	/** Current form. */
	public readonly form = new BehaviorSubject<
		| {
				data: Promise<IForm>;
				downloadProgress: Observable<number>;
				editable: boolean;
				metadata?: Observable<IAccountFileRecord>;
				name?: Promise<string>;
		  }
		| undefined
	>(undefined);

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();

		this.subscriptions.push(
			observableAll([
				this.activatedRoute.data,
				this.activatedRoute.params
			]).subscribe(([data, params]) => {
				try {
					const appointmentID: string | undefined =
						params.appointmentID;
					const id: string | undefined = params.id;
					const editable = data.editable === true;

					if (appointmentID && id) {
						const i = toInt(id);
						const downloadTask = this.accountFilesService.downloadFile(
							appointmentID,
							AccountFileRecord.RecordTypes.Appointment
						);

						this.form.next({
							data: downloadTask.result.then(o => {
								const form = o.forms ? o.forms[i] : undefined;
								if (!form) {
									throw new Error('Invalid form index.');
								}
								return form;
							}),
							downloadProgress: downloadTask.progress,
							editable,
							name: downloadTask.result.then(
								o =>
									o.calendarInvite.title ||
									this.stringsService.form
							)
						});
					}
					else if (id) {
						const downloadTask = this.accountFilesService.downloadFile(
							id,
							AccountFileRecord.RecordTypes.Form
						);

						this.form.next({
							data: downloadTask.result,
							downloadProgress: downloadTask.progress,
							editable,
							metadata: this.accountFilesService.watchMetadata(id)
						});
					}
					else {
						this.form.next(undefined);
						throw new Error('Invalid form ID.');
					}
				}
				catch {
					this.router.navigate(['404']);
				}
			})
		);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
