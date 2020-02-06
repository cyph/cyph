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
	AccountPostCircle,
	BinaryProto,
	DataURIProto,
	IAccountPost,
	IAccountPostCircle,
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
import {StringsService} from './strings.service';

/**
 * Angular service for social networking posts.
 */
@Injectable()
export class AccountPostsService extends BaseProvider {
	/** Mapping of circle IDs to names. */
	public readonly circles = this.accountDatabaseService.getAsyncMap<
		IAccountPostCircle
	>('circles', AccountPostCircle);

	/** Current draft post. */
	public readonly draft = {
		content: new BehaviorSubject<string>(''),
		image: new BehaviorSubject<Uint8Array | undefined>(undefined),
		isPublic: new BehaviorSubject<boolean>(false)
	};

	/** Decodes post image to SafeUrl. */
	public readonly getPostImage = memoize(
		async (
			post:
				| IAccountPost
				| BehaviorSubject<Uint8Array | undefined>
				| undefined
		) => {
			const image =
				post === undefined ?
					undefined :
				post instanceof BehaviorSubject ?
					post.value :
					post.image;

			return image ? deserialize(DataURIProto, image) : undefined;
		},
		(
			post:
				| IAccountPost
				| BehaviorSubject<Uint8Array | undefined>
				| undefined
		) =>
			post === undefined ?
				undefined :
			post instanceof BehaviorSubject ?
				post.value :
				post.image
	);

	/** Accepts circle shared by another user. */
	public readonly getCircle = memoize(
		async (username: string) : Promise<IAccountPostCircle> => {
			const currentUser = await this.accountDatabaseService.getCurrentUser();

			/** TODO: Handle case of multiple circles per user. */
			const circleID = (await this.accountDatabaseService.getListKeys(
				`externalCirclesIncoming/${username}`
			))[0];

			if (!circleID) {
				throw new Error(
					`External circle for user ${username} not found.`
				);
			}

			return this.accountDatabaseService.getOrSetDefault(
				`externalCircles/${username}/${circleID}`,
				AccountPostCircle,
				async () =>
					deserialize(
						AccountPostCircle,
						await this.potassiumService.sign.open(
							await this.potassiumService.box.open(
								await this.accountDatabaseService.getItem(
									`externalCirclesIncoming/${username}/${circleID}`,
									BinaryProto,
									SecurityModels.unprotected
								),
								currentUser.keys.encryptionKeyPair
							),
							(await this.accountDatabaseService.getUserPublicKeys(
								username
							)).signing,
							`users/${currentUser.user.username}/externalCirclesIncoming/${username}/${circleID}`
						)
					),
				undefined,
				undefined,
				true
			);
		}
	);

	/** Gets all post data for specified user. */
	public readonly getUserPostDataFull = memoize(
		(username?: string) : IAccountPostData => {
			const urlPrefix = !username ? '' : `users/${username}/`;

			const postData: IAccountPostData = {
				private: memoize(() => {
					const circle = !username ?
						/** TODO: Handle case of multiple circles per user. */
						this.circles
							.getValue()
							.then(o => Array.from(o.values())[0]) :
						this.getCircle(username);

					return {
						getPost: async (id: string) : Promise<IAccountPost> => {
							if (!(await postData.private().posts.hasItem(id))) {
								return postData.public().getPost(id);
							}

							return {
								...(await postData.private().posts.getItem(id)),
								circle: (await circle).id,
								id
							};
						},
						ids: this.accountDatabaseService.getAsyncList(
							circle.then(o => `root/privatePostLists/${o.id}`),
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
							circle.then(o => o.key)
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
						id
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
	public readonly postData: IAccountPostData = this.getUserPostDataFull();

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
				if (
					username ===
					this.accountDatabaseService.currentUser.value?.user.username
				) {
					username = undefined;
				}

				let postDataPart = this.getUserPostDataFull(username).public();

				try {
					if (this.accountDatabaseService.currentUser.value) {
						if (username) {
							await this.getCircle(username);
						}

						postDataPart = this.getUserPostDataFull(
							username
						).private();
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

	/** Creates a circle. */
	public async createCircle (
		name: string,
		predecessorID?: string
	) : Promise<string> {
		const id = uuid(true);

		await this.circles.setItem(id, {
			id,
			key: this.potassiumService.randomBytes(
				await this.potassiumService.secretBox.keyBytes
			),
			name,
			predecessorID
		});

		return id;
	}

	/** Creates a post. */
	public async createPost (
		content: string,
		isPublic: boolean,
		image?: Uint8Array
	) : Promise<string> {
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

		return id;
	}

	/** Deletes a post. */
	public async deletePost (id: string) : Promise<void> {
		const isPublic = await this.postData.public().posts.hasItem(id);

		await (isPublic ?
			this.postData.public :
			this.postData.private)().posts.removeItem(id);
	}

	/** Edits a post. */
	public async editPost (
		id: string,
		content: string,
		image?: Uint8Array
	) : Promise<void> {
		const isPublic = await this.postData.public().posts.hasItem(id);

		const postDataPart = (isPublic ?
			this.postData.public :
			this.postData.private)();

		await postDataPart.posts.updateItem(id, async o => {
			const timestamp = await getTimestamp();

			return {
				...(o || {timestamp}),
				content,
				image,
				lastEditTimestamp: timestamp
			};
		});
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
				const postDataPart = await this.getUserPostData(username);
				const ids = await postDataPart.ids.getTimedValue();

				const getAuthor = memoize(async () =>
					this.accountUserLookupService.getUser(username, false)
				);

				return (nMostRecent === undefined ?
					ids :
					ids.slice(-nMostRecent)
				).map(o => ({
					getAuthor,
					id: o.value,
					postDataPart,
					timestamp: o.timestamp
				}));
			})
		))
			.reduce((a, b) => a.concat(b), [])
			.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

		return (nMostRecent === undefined ?
			sorted :
			sorted.slice(-nMostRecent)
		).map(o => ({
			author: o.getAuthor(),
			id: o.id,
			post: o.postDataPart.watchPost(o.id)
		}));
	}

	/** Gets post data for specified user (includes all posts visible to current user). */
	public async getUserPostData (
		username?: string
	) : Promise<IAccountPostDataPart> {
		if (
			username ===
			this.accountDatabaseService.currentUser.value?.user.username
		) {
			username = undefined;
		}

		let postDataPart = this.getUserPostDataFull(username).public();

		try {
			if (this.accountDatabaseService.currentUser.value) {
				if (username) {
					await this.getCircle(username);
				}

				postDataPart = this.getUserPostDataFull(username).private();
			}
		}
		catch {}

		return postDataPart;
	}

	/** Gets a user's posts (reverse order). */
	public async getUserPosts (
		username?: string,
		nMostRecent?: number
	) : Promise<IAccountPost[]> {
		const postDataPart = await this.getUserPostData(username);
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

	/** Shares circle. */
	public async shareCircle (username: string) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		/** TODO: Handle case of multiple circles per user. */
		const circle = await this.circles
			.getValue()
			.then(o => Array.from(o.values())[0]);

		const url = `users/${username}/externalCirclesIncoming/${currentUser.user.username}/${circle.id}`;

		await this.accountDatabaseService.getOrSetDefault(
			url,
			BinaryProto,
			async () =>
				this.potassiumService.box.seal(
					await this.potassiumService.sign.sign(
						await serialize(AccountPostCircle, {
							...circle,
							name: ''
						}),
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
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		this.circles.getKeys().then(async keys => {
			if (keys.length > 0) {
				return;
			}

			await this.createCircle(this.stringsService.innerCircle);
		});
	}
}
