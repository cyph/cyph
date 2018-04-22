import {Component, OnInit} from '@angular/core';
import {StringProto} from '../../../cyph/proto';
import {PotassiumService} from '../../../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../../../cyph/services/database.service';
import {DialogService} from '../../../cyph/services/dialog.service';
import {EnvService} from '../../../cyph/services/env.service';
import {LocalStorageService} from '../../../cyph/services/local-storage.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {random} from '../../../cyph/util/random';
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

	/** Password to be used for unlock attempt. */
	public password: string		= '';

	/** Indicates whether component has been initiated. */
	public ready: boolean		= false;

	/** @ignore */
	private async tryUnlock (password: string, passive: boolean = false) : Promise<boolean> {
		let success	= false;

		if (this.correctPassword) {
			/* tslint:disable-next-line:possible-timing-attack */
			success	= this.password === this.correctPassword;

			if (!passive) {
				await sleep(random(1000, 250));
			}
		}
		else if (password) {
			const owner	= await this.databaseService.callFunction('environmentUnlock', {
				id: this.potassiumService.toHex(
					(await this.potassiumService.passwordHash.hash(
						password,
						this.databaseService.namespace +
						'Eaf60vuVWm67dNISjm6qdTGqgEhIW4Oes+BTsiuNjvs='
					)).hash
				),
				namespace: this.databaseService.namespace
			}).catch(
				() => undefined
			);

			if (typeof owner === 'string' && owner) {
				success	= true;

				if (!passive) {
					await this.dialogService.alert({
						content: `${this.stringsService.welcomeComma} ${owner}.`,
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
					this.localStorageService.setItem('password', StringProto, this.password)
			]);
		}

		return success;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!(
			this.envService.environment.customBuild && (
				this.envService.environment.customBuild.config.lockedDown ||
				this.envService.environment.customBuild.config.password
			)
		)) {
			this.appService.isLockedDown	= false;
			return;
		}

		this.correctPassword	= this.envService.environment.customBuild.config.password;

		await this.tryUnlock(
			await this.localStorageService.getItem('password', StringProto).catch(() => ''),
			true
		);

		this.ready	= true;
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

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
