import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {IAccountFileRecord, IForm} from '../../proto';
import {AccountFilesService} from '../services/account-files.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';


/**
 * Angular component for an individual form.
 */
@Component({
	selector: 'cyph-account-form',
	styleUrls: ['../../../css/components/account-form.scss'],
	templateUrl: '../../../templates/account-form.html'
})
export class AccountFormComponent implements OnInit {
	/** Current form. */
	public form?: {
		data: Promise<IForm>;
		downloadProgress: Observable<number>;
		metadata: Observable<IAccountFileRecord>;
	};

	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRouteService.params.subscribe(async o => {
			try {
				const id: string|undefined	= o.id;

				if (!id) {
					throw new Error('Invalid form ID.');
				}

				await this.accountAuthService.ready;

				const downloadTask	= this.accountFilesService.downloadForm(id);

				this.form	= {
					data: downloadTask.result,
					downloadProgress: downloadTask.progress,
					metadata: this.accountFilesService.watchMetadata(id)
				};
			}
			catch (_) {
				this.routerService.navigate(['404']);
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService
	) {}
}
