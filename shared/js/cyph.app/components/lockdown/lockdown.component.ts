import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../../cyph/base-provider';
import {StringProto} from '../../../cyph/proto';
import {DatabaseService} from '../../../cyph/services/database.service';
import {DialogService} from '../../../cyph/services/dialog.service';
import {EnvService} from '../../../cyph/services/env.service';
import {LocalStorageService} from '../../../cyph/services/local-storage.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {lockFunction} from '../../../cyph/util/lock';
import {random} from '../../../cyph/util/random';
import {requestJSON} from '../../../cyph/util/request';
import {sleep} from '../../../cyph/util/wait';
import {AppService} from '../../app.service';

/**
 * Angular component for the Cyph lockdown screen.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-lockdown',
	styleUrls: ['./lockdown.component.scss'],
	templateUrl: './lockdown.component.html'
})
export class LockdownComponent extends BaseProvider implements OnInit {
	/** @ignore */
	private correctPassword?: string;

	/** Indicates whether unlock attempt is in progress. */
	public readonly checking = new BehaviorSubject<boolean>(false);

	/** Indicates whether the last unlock attempt has failed. */
	public readonly error = new BehaviorSubject<boolean>(false);

	/** Password visibility setting. */
	public readonly hidePassword = new BehaviorSubject<boolean>(true);

	/** Unlock attempt lock. */
	public readonly lock = lockFunction();

	/** Password to be used for unlock attempt. */
	public readonly password = new BehaviorSubject<string>('');

	/** Indicates whether component has been initiated. */
	public readonly ready = new BehaviorSubject<boolean>(false);

	/** @ignore */
	private async tryUnlock (
		password: string,
		passive: boolean = false
	) : Promise<boolean> {
		return this.lock(async () => {
			if (!this.appService.isLockedDown.value) {
				return true;
			}

			let success = false;

			if (this.correctPassword) {
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				success = this.password.value === this.correctPassword;

				if (!passive) {
					await sleep(random(1000, 250));
				}
			}
			else if (password) {
				let name: string | undefined;

				try {
					const o = await requestJSON({
						/* eslint-disable-next-line @typescript-eslint/naming-convention */
						headers: {Authorization: password},
						method: 'POST',
						url: this.envService.baseUrl + 'pro/unlock'
					});

					if (o.namespace === this.databaseService.namespace) {
						name =
							typeof o.company === 'string' &&
							o.company.length > 0 ?
								o.company :
							typeof o.name === 'string' && o.name.length > 0 ?
								o.name :
								undefined;
					}
				}
				catch {}

				if (name) {
					success = true;

					if (!passive) {
						await this.dialogService.alert({
							content: `${
								this.stringsService.welcomeComma
							} ${name}${name.endsWith('.') ? '' : '.'}`,
							title: this.stringsService.unlockedTitle
						});
					}
				}
			}

			if (success) {
				await Promise.all([
					this.appService.unlock(),
					passive ?
						Promise.resolve(undefined) :
						this.localStorageService.setItem(
							'password',
							StringProto,
							password
						)
				]);
			}

			return success;
		});
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		this.correctPassword = this.envService.environment.customBuild ?
			this.envService.environment.customBuild.config.password :
			undefined;

		const urlPassword = (locationData.hash.match(/#unlock\/([^\/]+)$/) ||
			[])[1];

		if (urlPassword) {
			this.appService.resolveLockedDownRoute('');

			if (await this.tryUnlock(urlPassword)) {
				return;
			}

			this.error.next(true);
		}

		await this.tryUnlock(
			await this.localStorageService
				.getItem('password', StringProto)
				.catch(() => ''),
			true
		);

		this.ready.next(true);
		this.appService.loadComplete();
	}

	/** Initiates unlock attempt. */
	public async submit () : Promise<void> {
		this.checking.next(true);
		this.error.next(false);
		this.error.next(!(await this.tryUnlock(this.password.value)));
		this.checking.next(false);
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
