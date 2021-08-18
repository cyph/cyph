import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account generate invite code UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-generate-invite-code',
	styleUrls: ['./account-generate-invite-code.component.scss'],
	templateUrl: './account-generate-invite-code.component.html'
})
export class AccountGenerateInviteCodeComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
