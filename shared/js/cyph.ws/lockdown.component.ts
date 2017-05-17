import {Component, OnInit} from '@angular/core';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {StringsService} from '../cyph/services/strings.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';


/**
 * Angular component for the Cyph lockdown screen.
 */
@Component({
	selector: 'cyph-lockdown',
	styleUrls: ['../../css/components/cyph.ws/lockdown.scss'],
	templateUrl: '../../templates/cyph.ws/lockdown.html'
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

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!customBuildPassword) {
			this.appService.isLockedDown	= false;
			return;
		}

		this.correctPassword	= potassiumUtil.toString(
			potassiumUtil.fromBase64(customBuildPassword)
		);

		customBuildPassword		= undefined;

		if ((await this.localStorageService.getItem('password')) === this.correctPassword) {
			this.appService.unlock();
		}
	}

	/** Initiate unlock attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;

		await util.sleep(util.random(1000, 250));

		if (this.password === this.correctPassword) {
			await this.localStorageService.setItem('password', this.password);
			this.appService.unlock();
			return;
		}

		this.checking	= false;
		this.error		= true;
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
