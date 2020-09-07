import {Injectable} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {ListHoleError} from '../list-hole-error';
import {LockFunction} from '../lock-function-type';
import {ChannelMessage, IChannelMessage, StringProto} from '../proto';
import {IChannelService} from '../service-interfaces/ichannel.service';
import {IChannelHandlers} from '../session';
import {lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {DatabaseService} from './database.service';
import {LocalStorageService} from './local-storage.service';

/** @inheritDoc */
@Injectable()
export class ChannelService extends BaseProvider implements IChannelService {
	/** @ignore */
	private readonly _STATE = resolvable<{
		lock: LockFunction;
		messagesURL: string;
		url: string;
	}>();

	/** @ignore */
	private account: boolean = false;

	/** @ignore */
	private ephemeral: boolean = false;

	/** @ignore */
	private isClosed: boolean = false;

	/** @ignore */
	private parentID?: string;

	/** @ignore */
	private readonly receiveLock = lockFunction();

	/** @ignore */
	private readonly resolveState: (state: {
		lock: LockFunction;
		messagesURL: string;
		url: string;
	}) => void = this._STATE.resolve;

	/** @ignore */
	private readonly sendLock = lockFunction();

	/** @ignore */
	private readonly state: Promise<{
		lock: LockFunction;
		messagesURL: string;
		url: string;
	}> = this._STATE;

	/** @ignore */
	private readonly userID = resolvable<string>();

	/** Resolves when first batch of incoming messages have been processed. */
	public readonly initialMessagesProcessed = resolvable();

	/** @ignore */
	private get localStorageKey () : string {
		return `${this.account ? 'Account' : ''}ChannelUserID${
			this.parentID ? `-${this.parentID}` : ''
		}`;
	}

	/** @inheritDoc */
	public async close () : Promise<void> {
		if (this.isClosed || !this.ephemeral) {
			return;
		}

		this.isClosed = true;

		const {messagesURL, url} = await this.state;

		await Promise.all([
			this.databaseService.removeItem(url),
			this.localStorageService.removeItem(
				`${this.localStorageKey}:${messagesURL}`
			)
		]);
	}

	/** @inheritDoc */
	public destroy () : void {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		this.ngOnDestroy();
	}

	/** @inheritDoc */
	public async getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		blockGetValue?: boolean,
		subscriptions?: Subscription[]
	) : Promise<IAsyncValue<T>> {
		return this.databaseService.getAsyncValue(
			`${(await this.state).url}/${url}`,
			proto,
			undefined,
			blockGetValue,
			subscriptions
		);
	}

	/** @inheritDoc */
	public async init (
		channelID: string | undefined,
		channelSubID: string | undefined,
		userID: string | undefined,
		parentID: string | undefined,
		possibleChannelRejoin: boolean,
		account: boolean,
		handlers: IChannelHandlers
	) : Promise<void> {
		if (!channelID) {
			throw new Error('Invalid channel ID.');
		}

		this.account = account;
		this.parentID = parentID;

		const url = `channels/${channelID}`;
		const messagesURL = `channels/${channelSubID || channelID}/messages`;

		this.resolveState({
			lock: this.databaseService.lockFunction(`${url}/lock`),
			messagesURL,
			url
		});

		if (!userID) {
			this.ephemeral = true;
			userID = possibleChannelRejoin ?
				await this.localStorageService.getOrSetDefault(
					`${this.localStorageKey}:${messagesURL}`,
					StringProto,
					uuid
				) :
				uuid();

			/*
			this.databaseService.setDisconnectTracker(
				`${url}/disconnects/${userID}`
			);
			*/
		}

		this.userID.resolve(userID);

		let initialMessageCount = !this.ephemeral ?
			(await this.databaseService.getListKeys(messagesURL)).length :
			0;

		if (initialMessageCount === 0) {
			this.initialMessagesProcessed.resolve();
		}

		const connected = resolvable();

		this.subscriptions.push(
			this.databaseService
				.watchListPushes(
					messagesURL,
					ChannelMessage,
					undefined,
					true,
					this.subscriptions
				)
				.subscribe(async message =>
					this.receiveLock(async () => {
						if (initialMessageCount < 1) {
							await connected;
						}

						try {
							debugLog(() => ({
								channelMessage: {
									destroyed: this.destroyed.value,
									message,
									userID
								}
							}));

							if (
								message.value instanceof ListHoleError ||
								message.value.author === userID ||
								this.destroyed.value
							) {
								return;
							}

							await handlers.onMessage(
								message.value.cyphertext,
								initialMessageCount > 0
							);
						}
						catch (err) {
							debugLogError(() => ({
								channelOnMessageDecryptFailure: {
									cyphertext: !(
										message.value instanceof ListHoleError
									) ?
										potassiumUtil.toHex(
											message.value.cyphertext
										) :
										undefined,
									destroyed: this.destroyed.value,
									err,
									message,
									userID
								}
							}));
							return;
						}
						finally {
							if (initialMessageCount > 0) {
								--initialMessageCount;

								if (initialMessageCount === 0) {
									this.initialMessagesProcessed.resolve();
								}
							}
						}

						if (this.ephemeral) {
							return;
						}

						debugLog(() => ({channelMessageDelete: {message}}));
						await this.databaseService
							.removeItem(message.url)
							.catch(() => {});
					})
				)
		);

		if (
			(await this.databaseService
				.getList(`${url}/users`, StringProto)
				.catch(() => <string[]> [])).indexOf(userID) < 0
		) {
			await this.databaseService.pushItem(
				`${url}/users`,
				StringProto,
				userID
			);
		}

		let isOpen = false;
		this.subscriptions.push(
			this.databaseService
				.watchList(
					`${url}/users`,
					StringProto,
					true,
					this.subscriptions
				)
				.subscribe(
					async users => {
						if (users.length < 1) {
							return;
						}
						if (!isOpen) {
							isOpen = true;
							await handlers.onOpen(users[0].value === userID);
						}
						if (users.length < 2) {
							return;
						}
						await handlers.onConnect();
						connected.resolve();
					},
					async err => {
						await handlers.onClose();
						throw err;
					},
					async () => handlers.onClose()
				)
		);
	}

	/** @inheritDoc */
	public async lock<T> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		return (await this.state).lock(f, reason);
	}

	/** @inheritDoc */
	public async send (cyphertext: Uint8Array) : Promise<void> {
		await this.sendLock(async () =>
			this.databaseService.pushItem<IChannelMessage>(
				(await this.state).messagesURL,
				ChannelMessage,
				{author: await this.userID, cyphertext}
			)
		);
	}

	/** @inheritDoc */
	public spawn () : ChannelService {
		return new ChannelService(
			this.databaseService,
			this.localStorageService
		);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService
	) {
		super();
	}
}
