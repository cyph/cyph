import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	OnInit
} from '@angular/core';
import {BehaviorSubject, from, of, ReplaySubject} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {IAccountPost, IAccountPostComment} from '../../proto';
import {AccountPostsService} from '../../services/account-posts.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {SocialShareService} from '../../services/social-share.service';
import {StringsService} from '../../services/strings.service';
import {trackByCommentID, trackByID} from '../../track-by';
import {observableAll} from '../../util/observable-all';
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
export class AccountPostComponent
	extends BaseProvider
	implements OnChanges, OnInit
{
	/** Post author. */
	@Input() public author?: User;

	/** Post comments. */
	public readonly commentsObservable = new ReplaySubject<
		| {
				author: User | undefined;
				comment: IAccountPostComment;
		  }[]
		| undefined
	>(1);

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

	/** Repost data. */
	public readonly repostData = new ReplaySubject<
		| {
				author: User;
				post: IAccountPost;
		  }
		| undefined
	>(1);

	/** Indicates whether this is a repost embedded within another post. */
	@Input() public reposted: boolean = false;

	/** Indicates whether emoji picker is visible. */
	public readonly showEmojiPicker = new BehaviorSubject<boolean>(false);

	/** @see trackByCommentID */
	public readonly trackByCommentID = trackByCommentID;

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** Deletes comment. */
	public async deleteComment ({
		author,
		comment
	}: {
		author: User | undefined;
		comment: IAccountPostComment;
	}) : Promise<void> {
		if (
			!this.post?.id ||
			!author?.username ||
			!comment.id ||
			!(await this.dialogService.confirm({
				content: this.stringsService.postCommentDeletePrompt,
				title: this.stringsService.postCommentDeleteTitle
			}))
		) {
			return;
		}

		await this.accountPostsService.deleteComment(
			author.username,
			this.post.id,
			comment.id
		);
	}

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
	 * Edits comment.
	 * TODO: Better UI for this.
	 */
	public async editComment ({
		author,
		comment
	}: {
		author: User | undefined;
		comment: IAccountPostComment;
	}) : Promise<void> {
		if (!this.post?.id || !author?.username || !comment.id) {
			return;
		}

		const content = await this.dialogService.prompt({
			bottomSheet: true,
			content: this.stringsService.postCommentEditPrompt,
			placeholder: this.stringsService.postCommentContent,
			preFill: comment.content,
			title: this.stringsService.postCommentEditTitle
		});

		if (content === undefined) {
			return;
		}

		await this.accountPostsService.editComment(
			author.username,
			this.post.id,
			comment.id,
			content
		);
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
		await this.updatePost();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.updatePost();
	}

	/** Sets reaction. */
	public async react (reaction: string, add: boolean = true) : Promise<void> {
		this.showEmojiPicker.next(false);

		if (!this.post?.id || !this.user || !reaction) {
			return;
		}

		await this.accountPostsService.react(
			this.user.username,
			this.post.id,
			false,
			reaction,
			add
		);

		await this.updatePost();
		this.showEmojiPicker.next(false);
	}

	/** Reposts post. */
	public async repost () : Promise<void> {
		if (!this.post?.id || !this.user) {
			return;
		}

		const message = await this.dialogService.prompt({
			content: this.stringsService.postRepostPrompt,
			placeholder: this.stringsService.postRepostPlaceholder,
			title: this.stringsService.postRepostTitle
		});

		if (message === undefined) {
			return;
		}

		this.accountPostsService.draftPost.content.next(message);
		this.accountPostsService.draftPost.share.next({
			author: this.user.username,
			id: this.post.id
		});

		await this.accountPostsService.submitCurrentDraftPost();
	}

	/** Updates post. */
	public async updatePost () : Promise<void> {
		if (!this.post?.id || !this.user) {
			return;
		}

		if (this.post.repost?.author && this.post.repost?.id) {
			this.subscriptions.push(
				observableAll([
					from(
						this.accountUserLookupService.getUser(
							this.post.repost.author
						)
					),
					this.accountPostsService.watchPost(
						this.post.repost.author,
						this.post.repost.id
					)
				])
					.pipe(
						filter(
							([author, post]) =>
								author !== undefined && post !== undefined
						),
						map(([author, post]) => ({
							/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
							author: author!,
							/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
							post: post!
						}))
					)
					.subscribe(this.repostData)
			);
		}
		else {
			this.subscriptions.push(of(undefined).subscribe(this.repostData));
		}

		this.subscriptions.push(
			this.accountPostsService
				.watchComments(this.user.username, this.post.id)
				.subscribe(this.commentsObservable)
		);

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
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountPostsService */
		public readonly accountPostsService: AccountPostsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SocialShareService */
		public readonly socialShareService: SocialShareService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
