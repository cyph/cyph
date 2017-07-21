import {Component, ElementRef, OnInit} from '@angular/core';
import {IForm} from '../../proto';
import {newPatient} from '../forms/.';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';

/**
 * Angular component for account forms UI.
 */
@Component({
	selector: 'cyph-account-forms',
	styleUrls: ['../../../css/components/account-forms.scss'],
	templateUrl: '../../../templates/account-forms.html'
})

export class AccountFormsComponent implements OnInit {
	public newPatient: IForm	= newPatient();

	public ngOnInit () : void {
		/** To-do */
	}

	/** @see AccountFormsService.submit */
	public async submit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

	}
	constructor (
		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
