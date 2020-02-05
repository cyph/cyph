import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountPostsService} from '../../services/account-posts.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-compose',
	styleUrls: ['./account-post-compose.component.scss'],
	templateUrl: './account-post-compose.component.html'
})
export class AccountPostComposeComponent extends BaseProvider {
	constructor (
		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
