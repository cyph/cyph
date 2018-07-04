import {Component, OnInit} from '@angular/core';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {emailPattern} from '../../../cyph/email-pattern';
import {PotassiumService} from '../../../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../../../cyph/services/database.service';
import {EnvService} from '../../../cyph/services/env.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {AppService} from '../../app.service';


/**
 * Angular component for the Cyph trial signup screen.
 */
@Component({
	selector: 'cyph-trial-signup',
	styleUrls: ['./trial-signup.component.scss'],
	templateUrl: './trial-signup.component.html'
})
export class TrialSignupComponent implements OnInit {
	/** Indicates whether signup attempt is in progress. */
	public checking: boolean	= false;

	/** Email address. */
	public email: string		= '';

	/** @see emailPattern */
	public readonly emailPattern: typeof emailPattern	= emailPattern;

	/** Indicates whether the last signup attempt has failed. */
	public error: boolean		= false;

	/** Name. */
	public name: string			= '';

	/** Generated password. */
	public password?: string;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.appService.loadComplete();
	}

	/** Initiates signup attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;

		try {
			while (true) {
				const password		= await xkcdPassphrase.generateWithWordCount(4);

				const {tryAgain}	= await this.databaseService.callFunction('proTrialSignup', {
					email: this.email,
					id: this.potassiumService.toHex(
						(await this.potassiumService.passwordHash.hash(
							password,
							this.databaseService.salt
						)).hash
					),
					name: this.name,
					namespace: this.databaseService.namespace
				});

				if (!tryAgain) {
					this.password	= password;
					return;
				}
			}
		}
		catch {
			this.error		= true;
		}
		finally {
			this.checking	= false;
		}
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
