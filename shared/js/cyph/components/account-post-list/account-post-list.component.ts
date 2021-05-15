import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	SimpleChanges
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {AccountPostsService} from '../../services/account-posts.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';

/**
 * Angular component for account post list UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-list',
	styleUrls: ['./account-post-list.component.scss'],
	templateUrl: './account-post-list.component.html'
})
export class AccountPostListComponent
	extends BaseProvider
	implements OnChanges
{
	/** List of posts from this user. */
	@Input() public author?: User;

	/** Indicates whether posts should be shown. */
	public readonly showPosts = new BehaviorSubject<boolean>(false);

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (
			!changes.author ||
			(<User | undefined> changes.author.currentValue)?.username ===
				(<User | undefined> changes.author.previousValue)?.username
		) {
			return;
		}

		this.showPosts.next(false);
	}

	constructor (
		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
