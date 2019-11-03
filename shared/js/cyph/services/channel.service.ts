import {Injectable} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {LockFunction} from '../lock-function-type';
import {ChannelMessage, IChannelMessage, StringProto} from '../proto';
import {IChannelService} from '../service-interfaces/ichannel.service';
import {IChannelHandlers} from '../session';
import {lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {DatabaseService} from './database.service';

/** @inheritDoc */
@Injectable()
export class ChannelService extends BaseProvider implements IChannelService {
	/** @ignore */
	private readonly _STATE = resolvable<{lock: LockFunction; url: string}>();

	/** @ignore */
	private ephemeral: boolean = false;

	/** @ignore */
	private isClosed: boolean = false;

	/** @ignore */
	private readonly localLock: LockFunction = lockFunction();

	/** @ignore */
	private readonly resolveState: (state: {
		lock: LockFunction;
		url: string;
	}) => void = this._STATE.resolve;

	/** @ignore */
	private readonly state: Promise<{lock: LockFunction; url: string}> = this
		._STATE.promise;

	/** @ignore */
	private readonly userID = resolvable<string>();

	/** Resolves when first batch of incoming messages have been processed. */
	public readonly initialMessagesProcessed = resolvable();

	/** @inheritDoc */
	public async close () : Promise<void> {
		if (this.isClosed || !this.ephemeral) {
			return;
		}

		this.isClosed = true;

		await this.databaseService.removeItem((await this.state).url);
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
		userID: string | undefined,
		handlers: IChannelHandlers
	) : Promise<void> {
		if (!channelID) {
			throw new Error('Invalid channel ID.');
		}

		const url = `channels/${channelID}`;

		this.resolveState({
			lock: this.databaseService.lockFunction(`${url}/lock`),
			url
		});

		if (!userID) {
			userID = uuid();
			this.ephemeral = true;
			this.databaseService.setDisconnectTracker(
				`${url}/disconnects/${userID}`
			);
		}

		this.userID.resolve(userID);

		let initialMessageCount = !this.ephemeral ?
			(await this.databaseService.getListKeys(`${url}/messages`)).length :
			0;

		if (initialMessageCount === 0) {
			this.initialMessagesProcessed.resolve();
		}

		this.subscriptions.push(
			this.databaseService
				.watchListPushes(
					`${url}/messages`,
					ChannelMessage,
					undefined,
					true,
					this.subscriptions
				)
				.subscribe(async message => {
					try {
						debugLog(() => ({
							channelMessage: {
								destroyed: this.destroyed.value,
								message,
								userID
							}
						}));

						if (
							message.value.author === userID ||
							this.destroyed.value
						) {
							return;
						}

						await handlers.onMessage(message.value.cyphertext);
					}
					catch (err) {
						debugLogError(() => ({
							channelOnMessageDecryptFailure: err
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
		);

		if (
			this.ephemeral ||
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
					users => {
						if (users.length < 1) {
							return;
						}
						if (!isOpen) {
							isOpen = true;
							handlers.onOpen(users[0].value === userID);
						}
						if (users.length < 2) {
							return;
						}
						handlers.onConnect();
					},
					err => {
						handlers.onClose();
						throw err;
					},
					() => {
						handlers.onClose();
					}
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
		await this.localLock(async () =>
			this.databaseService.pushItem<IChannelMessage>(
				`${(await this.state).url}/messages`,
				ChannelMessage,
				{author: await this.userID.promise, cyphertext}
			)
		);
	}

	/** @inheritDoc */
	public spawn () : ChannelService {
		return new ChannelService(this.databaseService);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		super();
	}
}
