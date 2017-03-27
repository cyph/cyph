import {Component, OnInit} from '@angular/core';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {StringsService} from '../cyph/services/strings.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';


/**
 * Angular component for the Cyph lockdown screen.
 */
@Component({
	selector: 'cyph-lockdown',
	styleUrls: ['../css/components/cyph.im/lockdown.css'],
	templateUrl: '../../templates/cyph.im/lockdown.html'
})
export class LockdownComponent implements OnInit {
	/** @ignore */
	private correctPassword: string|undefined;

	/** Indicates whether unlock attempt is in progress. */
	public checking: boolean	= false;

	/** Indicates whether the last unlock attempt has failed. */
	public error: boolean		= false;

	/** Password to be used for unlock attempt. */
	public password: string		= '';

	/** @inheritDoc */
	public ngOnInit () : void {
		if (!customBuildPassword) {
			this.appService.isLockedDown	= false;
			return;
		}

		this.correctPassword	= potassiumUtil.toString(
			potassiumUtil.fromBase64(customBuildPassword)
		);

		customBuildPassword		= undefined;

		try {
			if (localStorage.getItem('password') === this.correctPassword) {
				this.appService.isLockedDown	= false;
			}
		}
		catch (_) {}
	}

	/** Initiate unlock attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;

		await util.sleep(util.random(1000, 250));

		if (this.password === this.correctPassword) {
			try {
				localStorage.setItem('password', this.password);
			}
			catch (_) {}

			this.appService.isLockedDown	= false;
			return;
		}

		this.checking	= false;
		this.error		= true;
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
