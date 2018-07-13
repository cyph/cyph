import {Component, OnInit} from '@angular/core';
import {LockFunction} from '../../../cyph/lock-function-type';
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
	selector: 'cyph-lockdown',
	styleUrls: ['./lockdown.component.scss'],
	templateUrl: './lockdown.component.html'
})
export class LockdownComponent implements OnInit {
	/** @ignore */
	private correctPassword?: string;

	/** Indicates whether unlock attempt is in progress. */
	public checking: boolean	= false;

	/** Indicates whether the last unlock attempt has failed. */
	public error: boolean		= false;

	/** Unlock attempt lock. */
	public lock: LockFunction	= lockFunction();

	/** Password to be used for unlock attempt. */
	public password: string		= '';

	/** Indicates whether component has been initiated. */
	public ready: boolean		= false;

	/** @ignore */
	private async tryUnlock (password: string, passive: boolean = false) : Promise<boolean> {
		return this.lock(async () => {
			if (!this.appService.isLockedDown) {
				return true;
			}

			let success	= false;

			if (this.correctPassword) {
				/* tslint:disable-next-line:possible-timing-attack */
				success	= this.password === this.correctPassword;

				if (!passive) {
					await sleep(random(1000, 250));
				}
			}
			else if (password) {
				let name: string|undefined;

				try {
					const o	= await requestJSON({
						headers: {Authorization: password},
						method: 'POST',
						url: this.envService.baseUrl + 'pro/unlock'
					});

					if (o.namespace === this.databaseService.namespace) {
						name	=
							typeof o.company === 'string' && o.company.length > 0 ?
								o.company :
							typeof o.name === 'string' && o.name.length > 0 ?
								o.name :
								undefined
						;
					}
				}
				catch {}

				if (name) {
					success	= true;

					if (!passive) {
						await this.dialogService.alert({
							content: `${this.stringsService.welcomeComma} ${name}${
								name.endsWith('.') ? '' : '.'
							}`,
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
						this.localStorageService.setItem('password', StringProto, password)
				]);
			}

			return success;
		});
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.correctPassword	=
			this.envService.environment.customBuild ?
				this.envService.environment.customBuild.config.password :
				undefined
		;

		const urlPassword		= (locationData.hash.match(/#unlock\/([^\/]+)$/) || [])[1];

		if (urlPassword) {
			this.appService.resolveLockedDownRoute('');

			if (await this.tryUnlock(urlPassword)) {
				return;
			}

			this.error	= true;
		}

		await this.tryUnlock(
			await this.localStorageService.getItem('password', StringProto).catch(() => ''),
			true
		);

		this.ready	= true;
		this.appService.loadComplete();
	}

	/** Initiates unlock attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;
		this.error		= !(await this.tryUnlock(this.password));
		this.checking	= false;
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
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
