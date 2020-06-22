import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost} from '../../proto';
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
export class AccountPostFeedComponent extends BaseProvider implements OnInit {
	/** Feed of posts from this user. */
	@Input() public author?: User;

	/** Post feed. */
	public readonly feed = new BehaviorSubject<
		{
			author: Promise<User | undefined>;
			id: string;
			post: Observable<IAccountPost | undefined>;
		}[]
	>([]);

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		this.feed.next(await this.accountPostsService.getFeed());
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
