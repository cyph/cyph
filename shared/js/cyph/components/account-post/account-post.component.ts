import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost} from '../../proto';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {getDateTimeString} from '../../util/time';

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

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** @see IAccountPost */
	@Input() public post?: IAccountPost;

	/** Deletes post. */
	public async deletePost () : Promise<void> {
		if (
			!this.post?.id ||
			!(await this.dialogService.confirm({
				content: this.stringsService.postDeletePrompt,
				title: this.stringsService.postDeleteTitle
			}))
		) {
			return;
		}

		await this.accountPostsService.deletePost(this.post.id);
	}

	/**
	 * Edits post.
	 * TODO: Better UI for this.
	 */
	public async editPost () : Promise<void> {
		if (!this.post?.id) {
			return;
		}

		const content = await this.dialogService.prompt({
			bottomSheet: true,
			content: this.stringsService.postEditPrompt,
			preFill: this.post.content,
			title: this.stringsService.postEditTitle
		});

		if (content === undefined) {
			return;
		}

		await this.accountPostsService.editPost(
			this.post.id,
			content,
			this.post.image
		);
	}

	/** @see author */
	public get user () : User | undefined {
		return (
			this.author || this.accountDatabaseService.currentUser.value?.user
		);
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

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
