import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	OnInit
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost} from '../../proto';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
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
export class AccountPostComponent extends BaseProvider
	implements OnChanges, OnInit {
	/** Post author. */
	@Input() public author?: User;

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** @see IAccountPost */
	@Input() public post?: IAccountPost;

	/** Post reactions. */
	public readonly reactions = new BehaviorSubject<
		{
			count: number;
			id: string;
			selected: boolean;
		}[]
	>([]);

	/** Indicates whether emoji picker is visible. */
	public readonly showEmojiPicker = new BehaviorSubject<boolean>(false);

	/** @see trackByID */
	public readonly trackByID = trackByID;

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
			placeholder: this.stringsService.postContent,
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

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		await this.updateReactions();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.updateReactions();
	}

	/** Sets reaction. */
	public async react (reaction: string, add: boolean = true) : Promise<void> {
		this.showEmojiPicker.next(false);

		if (!this.post?.id || !this.user) {
			return;
		}

		await this.accountPostsService.react(
			this.user.username,
			this.post.id,
			false,
			reaction,
			add
		);

		await this.updateReactions();
	}

	/** Updates reactions list. */
	public async updateReactions () : Promise<void> {
		if (!this.post?.id || !this.user) {
			return;
		}

		this.reactions.next(
			await this.accountPostsService.getReactions(
				this.user.username,
				this.post.id,
				false
			)
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
