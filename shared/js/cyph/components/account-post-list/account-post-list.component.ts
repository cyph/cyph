import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {AccountPostsService} from '../../services/account-posts.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {resolvable} from '../../util/wait/resolvable';

/**
 * Angular component for account post list UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-list',
	styleUrls: ['./account-post-list.component.scss'],
	templateUrl: './account-post-list.component.html'
})
export class AccountPostListComponent extends BaseProvider {
	/** List of posts from this user. */
	@Input() public author?: User;

	/** Indicates whether posts should be shown. */
	public readonly showPosts = resolvable(true);

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
