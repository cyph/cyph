import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {IAccountFileRecord, IAccountFileReference} from '../../proto';
import {AccountDownloadService} from '../../services/account-download.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {readableByteLength} from '../../util/formatting';

/**
 * Angular component for account download UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-download',
	styleUrls: ['./account-download.component.scss'],
	templateUrl: './account-download.component.html'
})
export class AccountDownloadComponent extends BaseProvider implements OnInit {
	/** Active download progress. */
	public readonly downloadProgress = new BehaviorSubject<number | undefined>(
		undefined
	);

	/** Error state. */
	public readonly error = new BehaviorSubject<boolean>(false);

	/** File reference/metadata. */
	public readonly file = new BehaviorSubject<
		(IAccountFileRecord & IAccountFileReference) | undefined
	>(undefined);

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();

		this.subscriptions.push(
			this.activatedRoute.params.subscribe(
				async ({id, username}: {id?: string; username?: string}) => {
					this.file.next(undefined);
					this.error.next(false);

					if (!id || !username) {
						return;
					}

					try {
						const [file] = await Promise.all([
							this.accountDownloadService.getFile(username, id),
							this.accountUserLookupService
								.getUser(username, false, true)
								.then(user => {
									this.accountService.setHeader(
										user || this.stringsService.download
									);
								})
						]);

						this.file.next(file);
					}
					catch {
						this.error.next(true);
					}
				}
			)
		);
	}

	/** Starts download. */
	public async startDownload () : Promise<void> {
		if (!this.file.value || this.downloadProgress.value !== undefined) {
			return;
		}

		this.downloadProgress.next(0);
		this.error.next(false);

		const {progress, result} = this.accountDownloadService.download(
			this.file.value
		);

		const sub = progress.subscribe(n => {
			if (this.downloadProgress.value !== undefined) {
				this.downloadProgress.next(n);
			}
		});

		try {
			await result;
		}
		catch {
			this.error.next(true);
		}

		this.downloadProgress.next(undefined);
		sub.unsubscribe();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountDownloadService: AccountDownloadService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
