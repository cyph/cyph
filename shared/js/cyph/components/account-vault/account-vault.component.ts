import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account vault UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-vault',
	styleUrls: ['./account-vault.component.scss'],
	templateUrl: './account-vault.component.html'
})
export class AccountVaultComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
