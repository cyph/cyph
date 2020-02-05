import {Injectable} from '@angular/core';
import {memoize} from 'lodash-es';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {
	IAccountPostData,
	IAccountPostDataPart,
	SecurityModels,
	User
} from '../account';
import {BaseProvider} from '../base-provider';
import {
	AccountPost,
	AccountPrivatePostKey,
	BinaryProto,
	DataURIProto,
	IAccountPost,
	IAccountPrivatePostKey,
	StringProto
} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountService} from './account.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {LocalStorageService} from './local-storage.service';

/**
 * Angular service for social networking posts.
 */
@Injectable()
export class AccountPostsService extends BaseProvider {
	/** Current draft post. */
	public readonly draft = {
		content: new BehaviorSubject<string>(''),
		image: new BehaviorSubject<Uint8Array | undefined>(undefined),
		isPublic: new BehaviorSubject<boolean>(false)
	};

	/** Decodes post image to SafeUrl. */
	public readonly getPostImage = memoize(
		async (
			post: IAccountPost | BehaviorSubject<Uint8Array | undefined>
		) => {
			const image =
				post instanceof BehaviorSubject ? post.value : post.image;
			return image ? deserialize(DataURIProto, image) : undefined;
		},
		(post: IAccountPost | BehaviorSubject<Uint8Array | undefined>) =>
			post instanceof BehaviorSubject ? post.value : post.image
	);

	/** Accepts private post key shared by another user. */
	public readonly getPrivatePostKey = memoize(
		async (username: string) : Promise<IAccountPrivatePostKey> => {
			const currentUser = await this.accountDatabaseService.getCurrentUser();

			return this.accountDatabaseService.getOrSetDefault(
				`privatePostKeys/${username}`,
				AccountPrivatePostKey,
				async () =>
					deserialize(
						AccountPrivatePostKey,
						await this.potassiumService.sign.open(
							await this.potassiumService.box.open(
								await this.accountDatabaseService.getItem(
									`privatePostKeysIncoming/${username}`,
									BinaryProto,
									SecurityModels.unprotected
								),
								currentUser.keys.encryptionKeyPair
							),
							(await this.accountDatabaseService.getUserPublicKeys(
								username
							)).signing,
							`users/${currentUser.user.username}/privatePostKeysIncoming/${username}`
						)
					),
				undefined,
				undefined,
				true
			);
		}
	);

	/** Gets post data for specified user. */
	public readonly getUserPostData = memoize(
		(username?: string) : IAccountPostData => {
			const urlPrefix = !username ? '' : `users/${username}/`;

			const postData: IAccountPostData = {
				private: memoize(() => {
					const privatePostKey = !username ?
						this.privatePostKey :
						this.getPrivatePostKey(username);

					return {
						getPost: async (id: string) : Promise<IAccountPost> => {
							if (!(await postData.private().posts.hasItem(id))) {
								return postData.public().getPost(id);
							}

							return {
								...(await postData.private().posts.getItem(id)),
								id,
								public: false
							};
						},
						ids: this.accountDatabaseService.getAsyncList(
							privatePostKey.then(
								o => `root/privatePostLists/${o.id}`
							),
							StringProto,
							SecurityModels.unprotected,
							undefined,
							undefined,
							false
						),
						posts: this.accountDatabaseService.getAsyncMap(
							`${urlPrefix}posts/private`,
							AccountPost,
							SecurityModels.privateSigned,
							privatePostKey.then(o => o.key)
						),
						watchPost: memoize(
							(id: string) : Observable<IAccountPost> =>
								toBehaviorSubject<IAccountPost>(async () => {
									if (
										!(await postData
											.private()
											.posts.hasItem(id))
									) {
										return postData.public().watchPost(id);
									}

									return postData
										.private()
										.posts.watchItem(id)
										.pipe(
											map(post => ({
												...(post ||
													AccountPost.create()),
												id,
												public: false
											}))
										);
								}, AccountPost.create())
						)
					};
				}),
				public: memoize(() => ({
					getPost: async (id: string) : Promise<IAccountPost> => ({
						...(await postData.public().posts.getItem(id)),
						id,
						public: true
					}),
					ids: this.accountDatabaseService.getAsyncList(
						`${urlPrefix}publicPostList`,
						StringProto,
						SecurityModels.unprotected,
						undefined,
						true,
						false
					),
					posts: this.accountDatabaseService.getAsyncMap(
						`${urlPrefix}posts/public`,
						AccountPost,
						SecurityModels.public,
						undefined,
						true
					),
					watchPost: memoize(
						(id: string) : Observable<IAccountPost> =>
							postData
								.public()
								.posts.watchItem(id)
								.pipe(
									map(post => ({
										...(post || AccountPost.create()),
										id,
										public: true
									}))
								)
					)
				}))
			};

			return postData;
		}
	);

	/** Post data for current user. */
	public readonly postData: IAccountPostData = this.getUserPostData();

	/** @see AccountPrivatePostKey */
	public readonly privatePostKey: Promise<
		IAccountPrivatePostKey
	> = this.localStorageService.getOrSetDefault(
		'privatePostKey',
		AccountPrivatePostKey,
		async () =>
			this.accountDatabaseService.getOrSetDefault(
				'privatePostKey',
				AccountPrivatePostKey,
				async () => ({
					id: uuid(true),
					key: this.potassiumService.randomBytes(
						await this.potassiumService.secretBox.keyBytes
					)
				})
			)
	);

	/** Watches a user's posts (reverse order). */
	public readonly watchUserPosts = memoize(
		(
			username?: string,
			nMostRecent?: number
		) : Observable<
			{
				id: string;
				watch: () => Observable<IAccountPost>;
			}[]
		> =>
			toBehaviorSubject<
				{
					id: string;
					watch: () => Observable<IAccountPost>;
				}[]
			>(async () => {
				let postDataPart = this.getUserPostData(username).public();

				try {
					if (this.accountDatabaseService.currentUser.value) {
						if (username) {
							await this.getPrivatePostKey(username);
						}

						postDataPart = this.getUserPostData(username).private();
					}
				}
				catch {}

				return postDataPart.ids.watch().pipe(
					map(ids =>
						(nMostRecent === undefined ?
							ids :
						nMostRecent < 1 ?
							[] :
							ids.slice(-nMostRecent)
						)
							.reverse()
							.map(id => ({
								id,
								watch: memoize(() => postDataPart.watchPost(id))
							}))
					)
				);
			}, []),
		(username?: string, nMostRecent?: number) =>
			`${username ? username : ''}\n${
				nMostRecent !== undefined ? nMostRecent.toString() : ''
			}`
	);

	/** @ignore */
	private async getUserPostList (
		username?: string
	) : Promise<IAccountPostDataPart> {
		let postDataPart = this.getUserPostData(username).public();

		try {
			if (this.accountDatabaseService.currentUser.value) {
				if (username) {
					await this.getPrivatePostKey(username);
				}

				postDataPart = this.getUserPostData(username).private();
			}
		}
		catch {}

		return postDataPart;
	}

	/** Creates a post. */
	public async createPost (
		content: string,
		isPublic: boolean,
		image?: Uint8Array
	) : Promise<void> {
		const id = uuid();

		await (isPublic ?
			this.postData.public :
			this.postData.private)().posts.setItem(id, {
			content,
			image,
			timestamp: await getTimestamp()
		});

		await Promise.all([
			this.postData.private().ids.pushItem(id),
			...(isPublic ? [this.postData.public().ids.pushItem(id)] : [])
		]);
	}

	/** Gets a feed of recent users' posts. */
	public async getFeed (
		nMostRecent: number | undefined = 20,
		usernames?: string[]
	) : Promise<
		{
			author: Promise<User | undefined>;
			id: string;
			post: Observable<IAccountPost>;
		}[]
	> {
		if (nMostRecent !== undefined && nMostRecent < 1) {
			return [];
		}

		if (usernames === undefined) {
			usernames = await this.accountDatabaseService.getListKeys(
				'contacts'
			);
		}

		const sorted = (await Promise.all(
			usernames.map(async username => {
				const postDataPart = await this.getUserPostList(username);
				const ids = await postDataPart.ids.getTimedValue();

				return (nMostRecent === undefined ?
					ids :
					ids.slice(-nMostRecent)
				).map(o => ({
					id: o.value,
					postDataPart,
					timestamp: o.timestamp,
					username
				}));
			})
		))
			.reduce((a, b) => a.concat(b), [])
			.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

		return (nMostRecent === undefined ?
			sorted :
			sorted.slice(-nMostRecent)
		).map(o => ({
			author: this.accountUserLookupService.getUser(o.username, false),
			id: o.id,
			post: o.postDataPart.watchPost(o.id)
		}));
	}

	/** Gets a user's posts (reverse order). */
	public async getUserPosts (
		username?: string,
		nMostRecent?: number
	) : Promise<IAccountPost[]> {
		const postDataPart = await this.getUserPostList(username);
		const ids = await postDataPart.ids.getValue();

		return Promise.all(
			(nMostRecent === undefined ?
				ids :
			nMostRecent < 1 ?
				[] :
				ids.slice(-nMostRecent)
			)
				.reverse()
				.map(async id => postDataPart.getPost(id))
		);
	}

	/** Posts current draft. */
	public async postCurrentDraft () : Promise<void> {
		this.accountService.interstitial.next(true);

		try {
			await this.createPost(
				this.draft.content.value,
				this.draft.isPublic.value,
				this.draft.image.value
			);

			this.draft.content.next('');
			this.draft.image.next(undefined);
			this.draft.isPublic.next(false);
		}
		finally {
			this.accountService.interstitial.next(false);
		}
	}

	/** Shares private post key. */
	public async sharePrivatePostKey (username: string) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		const url = `users/${username}/privatePostKeysIncoming/${currentUser.user.username}`;

		await this.accountDatabaseService.getOrSetDefault(
			url,
			BinaryProto,
			async () =>
				this.potassiumService.box.seal(
					await this.potassiumService.sign.sign(
						await serialize(
							AccountPrivatePostKey,
							await this.privatePostKey
						),
						currentUser.keys.signingKeyPair.privateKey,
						url
					),
					(await this.accountDatabaseService.getUserPublicKeys(
						username
					)).encryption
				),
			SecurityModels.unprotected,
			undefined,
			true
		);
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
