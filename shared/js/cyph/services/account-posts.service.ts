import {Injectable} from '@angular/core';
import {memoize} from 'lodash-es';
import {combineLatest, Observable} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {IAccountPostData, SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {
	AccountPost,
	AccountPrivatePostKey,
	BinaryProto,
	IAccountPost,
	IAccountPrivatePostKey,
	StringProto
} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {LocalStorageService} from './local-storage.service';

/**
 * Angular service for social networking posts.
 */
@Injectable()
export class AccountPostsService extends BaseProvider {
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
			const urlPrefix = !username ? '' : `root/users/${username}/`;

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
								public: false
							};
						},
						ids: this.accountDatabaseService.getAsyncList(
							privatePostKey.then(
								o => `root/privatePostLists/${o.id}`
							),
							StringProto,
							SecurityModels.unprotected
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
						public: true
					}),
					ids: this.accountDatabaseService.getAsyncList(
						`${urlPrefix}publicPostList`,
						StringProto,
						SecurityModels.unprotected
					),
					posts: this.accountDatabaseService.getAsyncMap(
						`${urlPrefix}posts/public`,
						AccountPost,
						SecurityModels.public
					),
					watchPost: memoize(
						(id: string) : Observable<IAccountPost> =>
							postData
								.public()
								.posts.watchItem(id)
								.pipe(
									map(post => ({
										...(post || AccountPost.create()),
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
		) : Observable<IAccountPost[]> =>
			toBehaviorSubject<IAccountPost[]>(async () => {
				let postDataPart = this.getUserPostData(username).public();

				try {
					if (username) {
						await this.getPrivatePostKey(username);
					}

					postDataPart = this.getUserPostData(username).private();
				}
				catch {}

				return postDataPart.ids.watch().pipe(
					mergeMap(ids =>
						combineLatest(
							ids
								.slice(
									nMostRecent === undefined ? 0 : -nMostRecent
								)
								.reverse()
								.map(id => postDataPart.watchPost(id))
						)
					)
				);
			}, []),
		(username?: string, nMostRecent?: number) =>
			`${username ? username : ''}\n${
				nMostRecent !== undefined ? nMostRecent.toString() : ''
			}`
	);

	/** Creates a post. */
	public async createPost (
		content: string,
		isPublic: boolean
	) : Promise<void> {
		const id = uuid();

		await (isPublic ?
			this.postData.public :
			this.postData.private)().posts.setItem(id, {
			content,
			timestamp: await getTimestamp()
		});

		await Promise.all([
			this.postData.private().ids.pushItem(id),
			...(isPublic ? [this.postData.public().ids.pushItem(id)] : [])
		]);
	}

	/** Gets a user's posts (reverse order). */
	public async getUserPosts (
		username?: string,
		nMostRecent?: number
	) : Promise<IAccountPost[]> {
		let postDataPart = this.getUserPostData(username).public();

		try {
			if (username) {
				await this.getPrivatePostKey(username);
			}

			postDataPart = this.getUserPostData(username).private();
		}
		catch {}

		return Promise.all(
			(await postDataPart.ids.getValue())
				.slice(nMostRecent === undefined ? 0 : -nMostRecent)
				.reverse()
				.map(async id => postDataPart.getPost(id))
		);
	}

	/** Shares private post key. */
	public async sharePrivatePostKey (username: string) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		const url = `users/${username}/privatePostKeysIncoming/${currentUser.user.username}`;

		await this.accountDatabaseService.getOrSetDefault(
			`root/${url}`,
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
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
