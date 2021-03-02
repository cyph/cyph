import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountSettingsService} from '../../services/account-settings.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account setup checklist UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-setup-checklist',
	styleUrls: ['./account-setup-checklist.component.scss'],
	templateUrl: './account-setup-checklist.component.html'
})
export class AccountSetupChecklistComponent extends BaseProvider {
	constructor (
		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
