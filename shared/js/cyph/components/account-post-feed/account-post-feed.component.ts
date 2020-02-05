import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {AccountPostsService} from '../../services/account-posts.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';

/**
 * Angular component for account post feed UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-feed',
	styleUrls: ['./account-post-feed.component.scss'],
	templateUrl: './account-post-feed.component.html'
})
export class AccountPostFeedComponent extends BaseProvider {
	/** Feed of posts from this user. */
	@Input() public author?: User;

	/** @see trackByID */
	public readonly trackByID = trackByID;

	constructor (
		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
