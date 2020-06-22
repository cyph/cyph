import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post page UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-post-page',
	styleUrls: ['./account-post-page.component.scss'],
	templateUrl: './account-post-page.component.html'
})
export class AccountPostPageComponent extends BaseProvider implements OnInit {
	/** Data to load post. */
	public readonly data = this.activatedRoute.params.pipe(
		map(({postID, username}: {postID?: string; username?: string}) =>
			!postID || !username ?
				undefined :
				{
					author: this.accountUserLookupService.getUser(username),
					id: postID,
					post: this.accountPostsService.watchPost(username, postID)
				}
		)
	);

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.subscriptions.push(
			this.data.subscribe(async o => {
				this.accountService.setHeader(
					(await o?.author) || this.stringsService.post
				);
			})
		);
	}
}
