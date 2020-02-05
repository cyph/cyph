import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost} from '../../proto';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post',
	styleUrls: ['./account-post.component.scss'],
	templateUrl: './account-post.component.html'
})
export class AccountPostComponent extends BaseProvider {
	/** @see IAccountPost */
	@Input() public post?: IAccountPost;

	/** Post author. */
	@Input() public user?: User;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
