import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {IAccountFileRecord, IForm} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for an individual form.
 */
@Component({
	selector: 'cyph-account-form',
	styleUrls: ['./account-form.component.scss'],
	templateUrl: './account-form.component.html'
})
export class AccountFormComponent implements OnInit {
	/** Current form. */
	public readonly form	= new BehaviorSubject<{
		data: Promise<IForm>;
		downloadProgress: Observable<number>;
		editable: boolean;
		metadata?: Observable<IAccountFileRecord>;
		name?: Promise<string>;
	}|undefined>(undefined);

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		combineLatest(
			this.activatedRoute.data,
			this.activatedRoute.params
		).subscribe(async ([data, params]) => {
			try {
				const appointmentID: string|undefined	= params.appointmentID;
				const id: string|undefined				= params.id;
				const editable							= data.editable === true;

				if (appointmentID && id) {
					const i				= Number.parseInt(id, 10);
					const downloadTask	=
						this.accountFilesService.downloadAppointment(appointmentID)
					;

					this.form.next({
						data: downloadTask.result.then(o => {
							const form	= o.forms ? o.forms[i] : undefined;
							if (!form) {
								throw new Error('Invalid form index.');
							}
							return form;
						}),
						downloadProgress: downloadTask.progress,
						editable,
						name: downloadTask.result.then(o =>
							o.calendarInvite.title || this.stringsService.form
						)
					});
				}
				else if (id) {
					const downloadTask	= this.accountFilesService.downloadForm(id);

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
				this.router.navigate([accountRoot, '404']);
			}
		});
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
	) {}
}
