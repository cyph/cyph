/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {memoize} from 'lodash-es';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {
	IAccountPostData,
	IAccountPostDataPart,
	SecurityModels,
	User
} from '../account';
import {BaseProvider} from '../base-provider';
import {ITimedValue} from '../itimed-value';
import {
	AccountPost,
	AccountPostCircle,
	BinaryProto,
	DataURIProto,
	IAccountPost,
	IAccountPostCircle,
	StringArrayProto,
	StringProto
} from '../proto';
import {filterUndefined} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalizeArray} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {lockFunction} from '../util/lock';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {AccountContactsService} from './account-contacts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountService} from './account.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';

/**
 * Angular service for social networking posts.
 */
@Injectable()
export class AccountPostsService extends BaseProvider {
	/** @ignore */
	private readonly privatePostDataPartUpdates = new Map<
		string,
		BehaviorSubject<IAccountPostDataPart>
	>();

	/** @ignore */
	private readonly setCircleMembersLock = lockFunction();

	/** Mapping of circle IDs to names. */
	public readonly circles = memoize((username?: string) =>
		this.accountDatabaseService.getAsyncMap<IAccountPostCircle>(
			username ? `externalCircles/${username}` : 'circles',
			AccountPostCircle
		)
	);

	/** Mapping of circle IDs to member lists. */
	public readonly circleMembers = memoize((circleID: string) =>
		this.accountDatabaseService.getAsyncList(
			`circleMembers/${circleID}`,
			StringArrayProto,
			undefined,
			undefined,
			undefined,
			false
		)
	);

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

	/** Gets all post data for specified user. */
	public readonly getUserPostDataFull = memoize(
		(username?: string) : IAccountPostData => {
			const urlPrefix = !username ? '' : `users/${username}/`;

			const publicPostDataPart = (() : IAccountPostDataPart => {
				const ids = this.accountDatabaseService.getAsyncList(
					`${urlPrefix}publicPostList`,
					StringProto,
					SecurityModels.unprotected,
					undefined,
					true,
					false
				);

				const posts = this.accountDatabaseService.getAsyncMap<
					IAccountPost
				>(
					`${urlPrefix}posts/public`,
					AccountPost,
					SecurityModels.public,
					undefined,
					true
				);

				return {
					getIDs: async () => ids.getValue(),
					getPost: async id => ({
						...(await posts.getItem(id)),
						id
					}),
					getTimedIDs: async () => ids.getTimedValue(),
					hasPost: async id => posts.hasItem(id),
					pushID: async id => ids.pushItem(id),
					removePost: async id => posts.removeItem(id),
					setPost: async (id, post) => posts.setItem(id, post),
					updatePost: async (id, f) => posts.updateItem(id, f),
					watchIDs: memoize(() : Observable<string[]> => ids.watch()),
					watchPost: memoize(id =>
						posts.watchItem(id).pipe(
							map(
								(post) : IAccountPost | undefined =>
									post && {
										...post,
										circleID: '',
										id
									}
							)
						)
					)
				};
			})();

			const getCircleWrapper = memoize(
				(circle: IAccountPostCircle) => {
					const circleWrapper = {
						circle,
						getPost: async (id: string) : Promise<IAccountPost> => {
							if (!(await circleWrapper.posts.hasItem(id))) {
								return publicPostDataPart.getPost(id);
							}

							return {
								...(await circleWrapper.posts.getItem(id)),
								circleID: circle.id,
								id
							};
						},
						ids: this.accountDatabaseService.getAsyncList(
							`root/privatePostLists/${circle.id}`,
							StringProto,
							SecurityModels.unprotected,
							undefined,
							undefined,
							false
						),
						posts: this.accountDatabaseService.getAsyncMap<
							IAccountPost
						>(
							`${urlPrefix}posts/private`,
							AccountPost,
							SecurityModels.privateSigned,
							circle.key
						),
						watchPost: memoize(
							(
								id: string
							) : Observable<IAccountPost | undefined> =>
								toBehaviorSubject<IAccountPost | undefined>(
									async () => {
										if (
											!(await circleWrapper.posts.hasItem(
												id
											))
										) {
											return publicPostDataPart.watchPost(
												id
											);
										}

										return circleWrapper.posts
											.watchItem(id)
											.pipe(
												map(
													(
														post
													) :
														| IAccountPost
														| undefined =>
														post && {
															...post,
															circleID: circle.id,
															id
														}
												)
											);
									},
									undefined
								)
						)
					};
					return circleWrapper;
				},
				(circle: IAccountPostCircle) => circle.id
			);

			const getPrivatePostDataPart = memoize(
				async (circleOrCircleID: IAccountPostCircle | string) => {
					const currentCircle =
						typeof circleOrCircleID === 'string' ?
							await this.circles(username).getItem(
								circleOrCircleID
							) :
							circleOrCircleID;

					const oldCircles: IAccountPostCircle[] = [];
					for (
						let lastCircle = currentCircle;
						lastCircle.predecessorID;
						lastCircle = oldCircles[0]
					) {
						oldCircles.unshift(
							await this.circles(username).getItem(
								lastCircle.predecessorID
							)
						);
					}

					const [
						currentCircleWrapper,
						oldCircleWrappers
					] = await Promise.all([
						getCircleWrapper(currentCircle),
						Promise.all(oldCircles.map(getCircleWrapper))
					]);

					const oldIDData = (await Promise.all(
						oldCircleWrappers.map(async o =>
							(await o.ids.getTimedValue()).map((id) : [
								string,
								{
									circleWrapper: typeof o;
									timedValue: ITimedValue<string>;
								}
							] => [id.value, {circleWrapper: o, timedValue: id}])
						)
					)).reduce((a, b) => a.concat(b), []);

					const oldIDMap = new Map(oldIDData);
					const oldTimedIDs = oldIDData.map(([_, v]) => v.timedValue);

					const getCircleWrapperForID = (id: string) =>
						oldIDMap.get(id)?.circleWrapper || currentCircleWrapper;

					const privatePostDataPartInternal: IAccountPostDataPart = {
						getIDs: async () =>
							(await privatePostDataPartInternal.getTimedIDs()).map(
								o => o.value
							),
						getPost: async id =>
							getCircleWrapperForID(id).getPost(id),
						getTimedIDs: async () =>
							(await Promise.all([
								oldTimedIDs,
								currentCircleWrapper.ids.getTimedValue(),
								publicPostDataPart.getTimedIDs()
							]))
								.reduce((a, b) => a.concat(b), [])
								.sort((a, b) =>
									a.timestamp > b.timestamp ? 1 : -1
								),
						hasPost: async id =>
							getCircleWrapperForID(id).posts.hasItem(id),
						pushID: async id =>
							currentCircleWrapper.ids.pushItem(id),
						removePost: async id =>
							getCircleWrapperForID(id).posts.removeItem(id),
						setPost: async (id, post) =>
							currentCircleWrapper.posts.setItem(id, post),
						updatePost: async (id, f) =>
							getCircleWrapperForID(id).posts.updateItem(id, f),
						watchIDs: memoize(() =>
							combineLatest([
								currentCircleWrapper.ids.watch(),
								publicPostDataPart.watchIDs()
							]).pipe(
								mergeMap(async () =>
									privatePostDataPartInternal.getIDs()
								)
							)
						),
						watchPost: memoize(id =>
							getCircleWrapperForID(id).watchPost(id)
						)
					};

					const initPrivatePostDataPartUpdates = (
						circle: IAccountPostCircle
					) => {
						const subject = getOrSetDefault(
							this.privatePostDataPartUpdates,
							circle.id,
							() =>
								new BehaviorSubject(privatePostDataPartInternal)
						);
						subject.next(privatePostDataPartInternal);
						return subject;
					};

					const privatePostDataPartWatcher = initPrivatePostDataPartUpdates(
						currentCircle
					);

					for (const circle of oldCircles) {
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						initPrivatePostDataPartUpdates(circle);
					}

					return <IAccountPostDataPart> {
						getIDs: async () =>
							privatePostDataPartWatcher.value.getIDs(),
						getPost: async id =>
							privatePostDataPartWatcher.value.getPost(id),
						getTimedIDs: async () =>
							privatePostDataPartWatcher.value.getTimedIDs(),
						hasPost: async id =>
							privatePostDataPartWatcher.value.hasPost(id),
						pushID: async id =>
							privatePostDataPartWatcher.value.pushID(id),
						removePost: async id =>
							privatePostDataPartWatcher.value.removePost(id),
						setPost: async (id, post) =>
							privatePostDataPartWatcher.value.setPost(id, post),
						updatePost: async (id, f) =>
							privatePostDataPartWatcher.value.updatePost(id, f),
						watchIDs: memoize(() =>
							privatePostDataPartWatcher.pipe(
								mergeMap(latestPrivatePostDataPart =>
									latestPrivatePostDataPart.watchIDs()
								)
							)
						),
						watchPost: memoize(id =>
							privatePostDataPartWatcher.value.watchPost(id)
						)
					};
				},
				(circleOrCircleID: IAccountPostCircle | string) =>
					typeof circleOrCircleID === 'string' ?
						circleOrCircleID :
						circleOrCircleID.id
			);

			return {
				private: async () =>
					getPrivatePostDataPart(
						await (!username ?
							/* TODO: Handle case of multiple circles per user */
							this.getInnerCircle() :
							this.acceptIncomingCircles(
								username
							).then(async () =>
								this.getLatestSharedCircleID(username)
							))
					),
				public: publicPostDataPart
			};
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
			| {
					id: string;
					watch: () => Observable<IAccountPost | undefined>;
			  }[]
			| undefined
		> =>
			toBehaviorSubject<
				| {
						id: string;
						watch: () => Observable<IAccountPost | undefined>;
				  }[]
				| undefined
			>(async () => {
				if (
					username ===
					this.accountDatabaseService.currentUser.value?.user.username
				) {
					username = undefined;
				}

				let postDataPart = this.getUserPostDataFull(username).public;

				try {
					if (this.accountDatabaseService.currentUser.value) {
						if (username) {
							await this.getLatestSharedCircleID(username);
						}

						postDataPart = await this.getUserPostDataFull(
							username
						).private();
					}
				}
				catch {}

				return postDataPart.watchIDs().pipe(
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
			}, undefined),
		(username?: string, nMostRecent?: number) =>
			`${username ? username : ''}\n${
				nMostRecent !== undefined ? nMostRecent.toString() : ''
			}`
	);

	/** Accepts circles shared by another user. */
	private async acceptIncomingCircles (username: string) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		const circleIDs = await this.accountDatabaseService.getListKeys(
			`externalCirclesIncoming/${username}`
		);

		await Promise.all(
			circleIDs.map(async circleID =>
				this.accountDatabaseService.getOrSetDefault(
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
				)
			)
		);
	}

	/** Gets current active Inner Circle circle. */
	private async getInnerCircle () : Promise<IAccountPostCircle> {
		const innerCircle = Array.from(
			(await this.circles().getValue()).values()
		).find(
			o =>
				o.active &&
				o.circleType ===
					AccountPostCircle.AccountPostCircleTypes.InnerCircle
		);

		if (!innerCircle) {
			await this.createCircle(
				'',
				undefined,
				AccountPostCircle.AccountPostCircleTypes.InnerCircle
			);
			return this.getInnerCircle();
		}

		return innerCircle;
	}

	/** Gets ID of most recently shared circle. */
	private async getLatestSharedCircleID (username: string) : Promise<string> {
		/* TODO: Handle case of multiple circles per user */
		const circleID = (await this.accountDatabaseService.getListKeys(
			`externalCirclesIncoming/${username}`
		)).slice(-1)[0];

		if (!circleID) {
			throw new Error(`External circle for user ${username} not found.`);
		}

		return circleID;
	}

	/** Creates a circle. */
	public async createCircle (
		name: string,
		predecessorID?: string,
		circleType: AccountPostCircle.AccountPostCircleTypes = AccountPostCircle
			.AccountPostCircleTypes.Standard
	) : Promise<string> {
		const id = uuid(true);

		await this.circles().setItem(id, {
			active: true,
			circleType,
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

		const postDataPart = isPublic ?
			this.postData.public :
			await this.postData.private();

		await postDataPart.setPost(id, {
			content,
			image,
			timestamp: await getTimestamp()
		});

		await postDataPart.pushID(id);

		return id;
	}

	/** Deletes a post. */
	public async deletePost (id: string) : Promise<void> {
		const isPublic = await this.postData.public.hasPost(id);

		const postDataPart = isPublic ?
			this.postData.public :
			await this.postData.private();

		await postDataPart.setPost(id, {
			content: '',
			deleted: true,
			timestamp: 0
		});
	}

	/** Edits a post. */
	public async editPost (
		id: string,
		content: string,
		image?: Uint8Array
	) : Promise<void> {
		const isPublic = await this.postData.public.hasPost(id);

		const postDataPart = isPublic ?
			this.postData.public :
			await this.postData.private();

		await postDataPart.updatePost(id, async o => {
			const timestamp = await getTimestamp();

			return {
				...(o || {timestamp}),
				content,
				image,
				lastEditTimestamp: timestamp
			};
		});
	}

	/** Gets circle members. */
	public async getCircleMembers () : Promise<string[]> {
		/* TODO: Handle case of multiple circles per user */
		return this.circleMembers(
			(await this.getInnerCircle()).id
		).getFlatValue();
	}

	/** Gets a feed of recent users' posts. */
	public async getFeed (
		nMostRecent: number | undefined = 20,
		usernames?: string[]
	) : Promise<
		{
			author: Promise<User | undefined>;
			id: string;
			post: Observable<IAccountPost | undefined>;
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
				const ids = await postDataPart.getTimedIDs();

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

		let postDataPart = this.getUserPostDataFull(username).public;

		try {
			if (this.accountDatabaseService.currentUser.value) {
				if (username) {
					await this.getLatestSharedCircleID(username);
				}

				postDataPart = await this.getUserPostDataFull(
					username
				).private();
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
		const ids = await postDataPart.getIDs();

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

	/** Revokes access to a circle (non-retroactive). */
	public async revokeCircle (usernames: string[]) : Promise<void> {
		usernames = normalizeArray(usernames);

		if (usernames.length < 1) {
			return;
		}

		/* TODO: Handle case of multiple circles per user */
		const circle = await this.getInnerCircle();

		const circleMembers = await this.circleMembers(
			circle.id
		).getFlatValue();
		const circleMembersSet = new Set(circleMembers);

		const usersToRevoke = new Set(
			usernames.filter(username => circleMembersSet.has(username))
		);

		if (usersToRevoke.size < 1) {
			return;
		}

		await this.circles().updateItem(circle.id, async o => ({
			...(o || circle),
			active: false
		}));

		await this.createCircle(
			'',
			circle.id,
			AccountPostCircle.AccountPostCircleTypes.InnerCircle
		);

		await this.shareCircle(
			circleMembers.filter(
				circleMember => !usersToRevoke.has(circleMember)
			)
		);
	}

	/** Shares and/or revokes circle access to exactly match the given list. */
	public async setCircleMembers (
		usernames: string[],
		finalConfirmation?: (username: string) => Promise<boolean>
	) : Promise<void> {
		return this.setCircleMembersLock(async () => {
			usernames = normalizeArray(usernames);
			const usernamesSet = new Set(usernames);

			/* TODO: Handle case of multiple circles per user */
			const circle = await this.getInnerCircle();

			const circleMembers = await this.circleMembers(
				circle.id
			).getFlatValue();
			const circleMembersSet = new Set(circleMembers);

			const usersToAdd = usernames.filter(
				username => !circleMembersSet.has(username)
			);
			const usersToRevoke = circleMembers.filter(
				circleMember => !usernamesSet.has(circleMember)
			);

			if (usersToAdd.length < 1 && usersToRevoke.length < 1) {
				return;
			}

			await this.revokeCircle(usersToRevoke);
			await this.shareCircle(usersToAdd, finalConfirmation);
		});
	}

	/** Shares circle. */
	public async shareCircle (
		usernames: string[],
		finalConfirmation?: (username: string) => Promise<boolean>
	) : Promise<void> {
		usernames = normalizeArray(usernames);

		if (finalConfirmation) {
			usernames = filterUndefined(
				await Promise.all(
					usernames.map(async username =>
						(await finalConfirmation(username)) ?
							username :
							undefined
					)
				)
			);
		}

		if (usernames.length < 1) {
			return;
		}

		const currentUser = await this.accountDatabaseService.getCurrentUser();

		/* TODO: Handle case of multiple circles per user */
		const currentCircle = await this.getInnerCircle();

		const oldCircles: IAccountPostCircle[] = [];
		for (
			let lastCircle = currentCircle;
			lastCircle.predecessorID;
			lastCircle = oldCircles[0]
		) {
			oldCircles.unshift(
				await this.circles().getItem(lastCircle.predecessorID)
			);
		}

		await Promise.all(
			usernames.map(async username => {
				const shareCircleWithUser = async (
					circle: IAccountPostCircle
				) => {
					const url = `users/${username}/externalCirclesIncoming/${currentUser.user.username}/${circle.id}`;

					await this.accountDatabaseService.getOrSetDefault(
						url,
						BinaryProto,
						async () =>
							this.potassiumService.box.seal(
								await this.potassiumService.sign.sign(
									await serialize<IAccountPostCircle>(
										AccountPostCircle,
										{
											...circle,
											name: ''
										}
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
				};

				await Promise.all(oldCircles.map(shareCircleWithUser));
				await shareCircleWithUser(currentCircle);
			})
		);

		await this.circleMembers(currentCircle.id).pushItem(usernames);
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();

		this.accountContactsService.accountPostsService.next(this);
	}
}
