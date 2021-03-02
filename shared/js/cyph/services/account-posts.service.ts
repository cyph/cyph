/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {memoize} from 'lodash-es';
import {BehaviorSubject, from, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
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
	AccountPostComment,
	AccountPostCommentReference,
	BinaryProto,
	DataURIProto,
	IAccountPost,
	IAccountPostCircle,
	IAccountPostComment,
	IAccountPostCommentReference,
	IAccountPostReference,
	StringArrayProto,
	StringProto
} from '../proto';
import {filterUndefined} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {lockFunction} from '../util/lock';
import {observableAll} from '../util/observable-all';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {AccountContactsService} from './account-contacts.service';
import {AccountSettingsService} from './account-settings.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountService} from './account.service';
import {ConfigService} from './config.service';
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

	/** Current draft comment. */
	public readonly draftComment = {
		content: new BehaviorSubject<string>('')
	};

	/** Current draft post. */
	public readonly draftPost = {
		content: new BehaviorSubject<string>(''),
		image: new BehaviorSubject<Uint8Array | undefined>(undefined),
		isPublic: new BehaviorSubject<boolean>(false),
		share: new BehaviorSubject<IAccountPostReference | undefined>(undefined)
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
			if (
				username ===
				this.accountDatabaseService.currentUser.value?.user.username
			) {
				username = undefined;
			}

			const urlPrefix = !username ? '' : `users/${username}/`;

			const getCommentReferences = async (id: string) =>
				this.accountDatabaseService.filterListHoles(
					this.accountDatabaseService.getList(
						`${urlPrefix}postReplies/${id}`,
						AccountPostCommentReference,
						SecurityModels.unprotected,
						undefined,
						true,
						false
					)
				);

			const watchCommentReferences = (id: string) =>
				this.accountDatabaseService
					.watchList(
						`${urlPrefix}postReplies/${id}`,
						AccountPostCommentReference,
						SecurityModels.unprotected,
						undefined,
						true,
						false,
						this.subscriptions
					)
					.pipe(
						map(arr =>
							this.accountDatabaseService
								.filterListHoles<IAccountPostCommentReference>(
									arr
								)
								.map(o => o.value)
						)
					);

			const pushCommentID = async (postID: string, commentID: string) => {
				await this.accountDatabaseService.pushItem<
					IAccountPostCommentReference
				>(
					`${urlPrefix}postReplies/${postID}`,
					AccountPostCommentReference,
					{
						author: (await this.accountDatabaseService.getCurrentUser())
							.user.username,
						id: commentID
					},
					SecurityModels.unprotected,
					undefined,
					false
				);
			};

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

				const myComments = this.accountDatabaseService.getAsyncMap<
					IAccountPostComment
				>('postComments', AccountPostComment, SecurityModels.public);

				const getComment = async (
					commentRef: IAccountPostCommentReference
				) =>
					Promise.all([
						this.accountUserLookupService.getUser(
							commentRef.author
						),
						this.accountDatabaseService.getItem(
							`users/${commentRef.author}/postComments/${commentRef.id}`,
							AccountPostComment,
							SecurityModels.public,
							undefined,
							true
						)
					]).then(([author, comment]) => ({
						author,
						comment: {...comment, ...commentRef}
					}));

				const watchComment = memoize(
					(commentRef: IAccountPostCommentReference) =>
						observableAll([
							from(
								this.accountUserLookupService.getUser(
									commentRef.author
								)
							),
							this.accountDatabaseService.watch(
								`users/${commentRef.author}/postComments/${commentRef.id}`,
								AccountPostComment,
								SecurityModels.public,
								undefined,
								true
							)
						]).pipe(
							map(([author, comment]) => ({
								author,
								comment: {...comment.value, ...commentRef}
							}))
						),
					(commentRef: IAccountPostCommentReference) =>
						`${commentRef.author}\n${commentRef.id}`
				);

				return {
					getComments: async id =>
						(await Promise.all(
							(await getCommentReferences(id)).map(getComment)
						)).filter(o => o.comment.postID === id),
					getIDs: async () =>
						this.accountDatabaseService.filterListHoles(
							ids.getValue()
						),
					getPost: async id => ({
						...(await posts.getItem(id)),
						id
					}),
					getTimedIDs: async () =>
						this.accountDatabaseService.filterListHoles<string>(
							ids.getTimedValue()
						),
					hasPost: async id => posts.hasItem(id),
					pushCommentID,
					pushID: async id => ids.pushItem(id),
					removePost: async id => posts.removeItem(id),
					setComment: async (commentID, comment) =>
						myComments.setItem(commentID, comment),
					setPost: async (id, post) => posts.setItem(id, post),
					updateComment: async (commentID, f) =>
						myComments.updateItem(commentID, f),
					updatePost: async (id, f) => posts.updateItem(id, f),
					watchComments: memoize(id =>
						watchCommentReferences(id).pipe(
							switchMap(commentRefs =>
								observableAll(commentRefs.map(watchComment))
							),
							map(comments =>
								comments.filter(o => o.comment.postID === id)
							)
						)
					),
					watchIDs: memoize(
						() : Observable<string[]> =>
							this.accountDatabaseService.filterListHoles(
								ids.watch()
							)
					),
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
						getComment: async (
							commentRef: IAccountPostCommentReference
						) =>
							Promise.all([
								this.accountUserLookupService.getUser(
									commentRef.author
								),
								this.accountDatabaseService.getItem(
									`users/${commentRef.author}/postComments/${commentRef.id}`,
									AccountPostComment,
									SecurityModels.privateSigned,
									circle.key
								)
							]).then(([author, comment]) => ({
								author,
								comment: {...comment, ...commentRef}
							})),
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
						myComments: this.accountDatabaseService.getAsyncMap<
							IAccountPostComment
						>(
							'postComments',
							AccountPostComment,
							SecurityModels.privateSigned,
							circle.key
						),
						posts: this.accountDatabaseService.getAsyncMap<
							IAccountPost
						>(
							`${urlPrefix}posts/private`,
							AccountPost,
							SecurityModels.privateSigned,
							circle.key
						),
						watchComment: memoize(
							(commentRef: IAccountPostCommentReference) =>
								observableAll([
									from(
										this.accountUserLookupService.getUser(
											commentRef.author
										)
									),
									this.accountDatabaseService.watch(
										`users/${commentRef.author}/postComments/${commentRef.id}`,
										AccountPostComment,
										SecurityModels.privateSigned,
										circle.key
									)
								]).pipe(
									map(([author, comment]) => ({
										author,
										comment: {
											...comment.value,
											...commentRef
										}
									}))
								),
							(commentRef: IAccountPostCommentReference) =>
								`${commentRef.author}\n${commentRef.id}`
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
							this.accountDatabaseService
								.filterListHoles<string>(
									await o.ids.getTimedValue()
								)
								.map((id) : [
									string,
									{
										circleWrapper: typeof o;
										timedValue: ITimedValue<string>;
									}
								] => [
									id.value,
									{circleWrapper: o, timedValue: id}
								])
						)
					)).flat();

					const oldIDMap = new Map(oldIDData);
					const oldTimedIDs = oldIDData.map(([_, v]) => v.timedValue);

					const getCircleWrapperForID = (id: string) =>
						oldIDMap.get(id)?.circleWrapper || currentCircleWrapper;

					const privatePostDataPartInternal: IAccountPostDataPart = {
						getComments: async id =>
							(await Promise.all(
								(await getCommentReferences(id)).map(
									currentCircleWrapper.getComment
								)
							)).filter(o => o.comment.postID === id),
						getIDs: async () =>
							(await privatePostDataPartInternal.getTimedIDs()).map(
								o => o.value
							),
						getPost: async id =>
							getCircleWrapperForID(id).getPost(id),
						getTimedIDs: async () =>
							(await Promise.all([
								oldTimedIDs,
								this.accountDatabaseService.filterListHoles<
									string
								>(currentCircleWrapper.ids.getTimedValue()),
								publicPostDataPart.getTimedIDs()
							]))
								.flat()
								.sort((a, b) =>
									a.timestamp > b.timestamp ? 1 : -1
								),
						hasPost: async id =>
							getCircleWrapperForID(id).posts.hasItem(id),
						pushCommentID,
						pushID: async id =>
							currentCircleWrapper.ids.pushItem(id),
						removePost: async id =>
							getCircleWrapperForID(id).posts.removeItem(id),
						setComment: async (commentID, comment) =>
							currentCircleWrapper.myComments.setItem(
								commentID,
								comment
							),
						setPost: async (id, post) =>
							currentCircleWrapper.posts.setItem(id, post),
						updateComment: async (commentID, f) =>
							currentCircleWrapper.myComments.updateItem(
								commentID,
								f
							),
						updatePost: async (id, f) =>
							getCircleWrapperForID(id).posts.updateItem(id, f),
						watchComments: memoize(id =>
							watchCommentReferences(id).pipe(
								switchMap(commentRefs =>
									observableAll(
										commentRefs.map(
											currentCircleWrapper.watchComment
										)
									)
								),
								map(comments =>
									comments.filter(
										o => o.comment.postID === id
									)
								)
							)
						),
						watchIDs: memoize(() =>
							observableAll([
								currentCircleWrapper.ids.watch(),
								publicPostDataPart.watchIDs()
							]).pipe(
								switchMap(async () =>
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
						getComments: async id =>
							privatePostDataPartWatcher.value.getComments(id),
						getIDs: async () =>
							privatePostDataPartWatcher.value.getIDs(),
						getPost: async id =>
							privatePostDataPartWatcher.value.getPost(id),
						getTimedIDs: async () =>
							privatePostDataPartWatcher.value.getTimedIDs(),
						hasPost: async id =>
							privatePostDataPartWatcher.value.hasPost(id),
						pushCommentID: async (postID, commentID) =>
							privatePostDataPartWatcher.value.pushCommentID(
								postID,
								commentID
							),
						pushID: async id =>
							privatePostDataPartWatcher.value.pushID(id),
						removePost: async id =>
							privatePostDataPartWatcher.value.removePost(id),
						setComment: async (commentID, comment) =>
							privatePostDataPartWatcher.value.setComment(
								commentID,
								comment
							),
						setPost: async (id, post) =>
							privatePostDataPartWatcher.value.setPost(id, post),
						updateComment: async (commentID, f) =>
							privatePostDataPartWatcher.value.updateComment(
								commentID,
								f
							),
						updatePost: async (id, f) =>
							privatePostDataPartWatcher.value.updatePost(id, f),
						watchComments: memoize(id =>
							privatePostDataPartWatcher.value.watchComments(id)
						),
						watchIDs: memoize(() =>
							privatePostDataPartWatcher.pipe(
								switchMap(latestPrivatePostDataPart =>
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
								this.getLatestSharedCircleID(username || '')
							))
					),
				public: publicPostDataPart
			};
		}
	);

	/** Post data for current user. */
	public readonly postData: IAccountPostData = this.getUserPostDataFull();

	/** Watches comments on a post. */
	public readonly watchComments = memoize(
		(
			username: string,
			id: string
		) : Observable<
			| {author: User | undefined; comment: IAccountPostComment}[]
			| undefined
		> =>
			toBehaviorSubject<
				| {author: User | undefined; comment: IAccountPostComment}[]
				| undefined
			>(async () => {
				const postData = this.getUserPostDataFull(username);
				const isPublic = await postData.public.hasPost(id);

				const postDataPart = isPublic ?
					postData.public :
					await postData.private();

				return postDataPart.watchComments(id);
			}, undefined),
		(username: string, id: string) => `${username}\n${id}`
	);

	/** Watches a post. */
	public readonly watchPost = memoize(
		(username: string, id: string) : Observable<IAccountPost | undefined> =>
			toBehaviorSubject<IAccountPost | undefined>(
				async () =>
					this.getUserPostData(username).then(o => o.watchPost(id)),
				undefined
			),
		(username: string, id: string) => `${username}\n${id}`
	);

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

	/** Adds a comment to a post. */
	public async addComment (
		username: string,
		postID: string,
		content: string
	) : Promise<string> {
		const commentID = uuid();

		const postData = this.getUserPostDataFull(username);
		const isPublic = await postData.public.hasPost(postID);

		const postDataPart = isPublic ?
			postData.public :
			await postData.private();

		await postDataPart.setComment(commentID, {
			content,
			postID,
			timestamp: await getTimestamp()
		});

		await postDataPart.pushCommentID(postID, commentID);

		return commentID;
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
		image?: Uint8Array,
		share?: IAccountPostReference
	) : Promise<string> {
		const id = uuid();

		const postDataPart = isPublic ?
			this.postData.public :
			await this.postData.private();

		await postDataPart.setPost(id, {
			content,
			image,
			repost: share,
			timestamp: await getTimestamp()
		});

		await postDataPart.pushID(id);

		await this.accountSettingsService.updateSetupChecklist('social');

		return id;
	}

	/** Deletes a comment. */
	public async deleteComment (
		username: string,
		postID: string,
		commentID: string
	) : Promise<void> {
		const postData = this.getUserPostDataFull(username);
		const isPublic = await postData.public.hasPost(postID);

		const postDataPart = isPublic ?
			postData.public :
			await postData.private();

		await postDataPart.updateComment(commentID, async () => ({
			content: '',
			deleted: true,
			postID,
			timestamp: 0
		}));
	}

	/** Deletes a post. */
	public async deletePost (id: string) : Promise<void> {
		const isPublic = await this.postData.public.hasPost(id);

		const postDataPart = isPublic ?
			this.postData.public :
			await this.postData.private();

		await postDataPart.updatePost(id, async () => ({
			content: '',
			deleted: true,
			timestamp: 0
		}));
	}

	/** Edits a comment. */
	public async editComment (
		username: string,
		postID: string,
		commentID: string,
		content: string
	) : Promise<void> {
		const postData = this.getUserPostDataFull(username);
		const isPublic = await postData.public.hasPost(postID);

		const postDataPart = isPublic ?
			postData.public :
			await postData.private();

		await postDataPart.updateComment(commentID, async o => {
			const timestamp = await getTimestamp();

			return {
				...(o || {postID, timestamp}),
				content,
				lastEditTimestamp: timestamp
			};
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
		return this.accountDatabaseService.filterListHoles(
			this.circleMembers((await this.getInnerCircle()).id).getFlatValue()
		);
	}

	/** Gets comments on a post. */
	public async getComments (
		username: string,
		id: string
	) : Promise<{author: User | undefined; comment: IAccountPostComment}[]> {
		const postData = this.getUserPostDataFull(username);
		const isPublic = await postData.public.hasPost(id);

		const postDataPart = isPublic ?
			postData.public :
			await postData.private();

		return postDataPart.getComments(id);
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
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
					this.accountUserLookupService.getUser(username)
				);

				/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
			.flat()
			.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		return (nMostRecent === undefined ?
			sorted :
			sorted.slice(-nMostRecent)
		).map(o => ({
			author: o.getAuthor(),
			id: o.id,
			post: o.postDataPart.watchPost(o.id)
		}));
	}

	/** Gets reactions for post or comment. */
	public async getReactions (
		username: string,
		id: string,
		isComment: boolean
	) : Promise<{count: number; id: string; selected: boolean}[]> {
		const reactions = await this.accountDatabaseService.callFunction(
			'getReactions',
			{
				id,
				isComment,
				username
			}
		);

		if (typeof reactions !== 'object') {
			return [];
		}

		return this.configService.simpleEmoji
			.map(emoji => ({
				count:
					typeof reactions[emoji]?.count === 'number' ?
						reactions[emoji]?.count :
						0,
				id: emoji,
				selected:
					typeof reactions[emoji]?.selected === 'boolean' ?
						reactions[emoji]?.selected :
						false
			}))
			.filter(o => o.count > 0);
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

	/** Reacts to post or comment. */
	public async react (
		username: string,
		id: string,
		isComment: boolean,
		reaction: string,
		add: boolean = true
	) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		const url = `users/${normalize(username)}/${
			isComment ? 'postCommentReactions' : 'postReactions'
		}/${id}/${reaction}/${currentUser.user.username}`;

		if (!add) {
			return this.accountDatabaseService.removeItem(url);
		}

		await this.accountDatabaseService.setItem(
			url,
			BinaryProto,
			new Uint8Array(0),
			SecurityModels.unprotected
		);
	}

	/** Revokes access to a circle (non-retroactive). */
	public async revokeCircle (usernames: string[]) : Promise<void> {
		usernames = normalizeArray(usernames);

		if (usernames.length < 1) {
			return;
		}

		/* TODO: Handle case of multiple circles per user */
		const circle = await this.getInnerCircle();

		const circleMembers = await this.accountDatabaseService.filterListHoles(
			this.circleMembers(circle.id).getFlatValue()
		);
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

			const circleMembers = await this.accountDatabaseService.filterListHoles(
				this.circleMembers(circle.id).getFlatValue()
			);
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

	/** Submits current draft comment. */
	public async submitCurrentDraftComment (
		username: string,
		postID: string
	) : Promise<void> {
		if (!username || !postID || !this.draftComment.content.value) {
			return;
		}

		this.accountService.interstitial.next(true);

		try {
			await this.addComment(
				username,
				postID,
				this.draftComment.content.value
			);

			this.draftComment.content.next('');
		}
		finally {
			this.accountService.interstitial.next(false);
		}
	}

	/** Submits current draft post. */
	public async submitCurrentDraftPost () : Promise<void> {
		if (
			!this.draftPost.content.value &&
			this.draftPost.image.value === undefined &&
			this.draftPost.share.value === undefined
		) {
		}

		this.accountService.interstitial.next(true);

		try {
			await this.createPost(
				this.draftPost.content.value,
				this.draftPost.isPublic.value,
				this.draftPost.image.value,
				this.draftPost.share.value
			);

			this.draftPost.content.next('');
			this.draftPost.image.next(undefined);
			this.draftPost.isPublic.next(false);
			this.draftPost.share.next(undefined);
		}
		finally {
			this.accountService.interstitial.next(false);
		}
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();

		this.accountContactsService.accountPostsService.next(this);
	}
}
