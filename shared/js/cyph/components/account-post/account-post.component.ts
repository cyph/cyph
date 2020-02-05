import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost} from '../../proto';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
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
	/** Post author. */
	@Input() public author?: User;

	/** @see IAccountPost */
	@Input() public post?: IAccountPost;

	/** @see author */
	public get user () : User | undefined {
		return (
			this.author || this.accountDatabaseService.currentUser.value?.user
		);
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
