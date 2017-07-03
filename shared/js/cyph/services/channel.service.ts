import {Injectable} from '@angular/core';
import {env} from '../env';
import {LockFunction} from '../lock-function-type';
import {IChannelHandlers} from '../session/ichannel-handlers';
import {util} from '../util';
import {DatabaseService} from './database.service';
import {ErrorService} from './error.service';


/**
 * Bidirectional network connection that sends and receives data.
 */
@Injectable()
export class ChannelService {
	/** @ignore */
	private channelRef: firebase.database.Reference;

	/** @ignore */
	private chunkSize: number		= env.isSafari ? 30720 : 5242880;

	/** @ignore */
	private databaseLock?: string;

	/** @ignore */
	private readonly handlers: Promise<IChannelHandlers>	=
		new Promise<IChannelHandlers>(resolve => {
			this.resolveHandlers	= resolve;
		})
	;

	/** @ignore */
	private readonly incomingMessages: Map<string, Map<number, string>>	=
		new Map<string, Map<number, string>>()
	;

	/** @ignore */
	private isAlice: boolean		= false;

	/** @ignore */
	private isClosed: boolean		= false;

	/** @ignore */
	private isConnected: boolean	= false;

	/** @ignore */
	private messagesRef: firebase.database.Reference;

	/** @ignore */
	private resolveHandlers: (handlers: IChannelHandlers) => void;

	/** @ignore */
	private sendLock: LockFunction	= util.lockFunction();

	/** @ignore */
	private userId: string;

	/** @ignore */
	private usersRef: firebase.database.Reference;

	/** This kills the channel. */
	public async close () : Promise<void> {
		if (this.isClosed) {
			return;
		}

		this.isClosed	= true;

		(await this.handlers).onClose();
		this.channelRef.remove().catch(() => {});
	}

	/**
	 * Initializes service.
	 * @param channelName Name of this channel.
	 * @param handlers Event handlers for this channel.
	 */
	public async init (channelName: string, handlers: IChannelHandlers) : Promise<void> {
		this.resolveHandlers(handlers);

		this.databaseLock	= `channels/${channelName}/lock`;

		this.channelRef		= await util.retryUntilSuccessful(async () =>
			(await this.databaseService.getDatabaseRef('channels')).child(channelName)
		);

		this.messagesRef	= await util.retryUntilSuccessful(async () =>
			this.channelRef.child('messages')
		);

		this.usersRef		= await util.retryUntilSuccessful(async () =>
			this.channelRef.child('users')
		);

		const userRef: firebase.database.ThenableReference	=
			await util.retryUntilSuccessful(() => this.usersRef.push(''))
		;

		this.userId			= userRef.key || '';

		const connectedRef	= await util.retryUntilSuccessful(async () =>
			this.databaseService.getDatabaseRef('.info/connected')
		);

		const disconnectRef	= await util.retryUntilSuccessful(async () =>
			this.channelRef.child('disconnects').child(this.userId)
		);

		connectedRef.on('value', snapshot => {
			if (!snapshot) {
				return;
			}

			if (snapshot.val() === true) {
				util.retryUntilSuccessful(async () => disconnectRef.remove());
			}
		});

		util.retryUntilSuccessful(async () =>
			disconnectRef.onDisconnect().set(await this.databaseService.timestamp())
		);

		await util.retryUntilSuccessful(async () => userRef.set(this.userId));

		this.isAlice		=
			Object.keys(
				await util.retryUntilSuccessful(async () =>
					(await this.usersRef.once('value')).val()
				)
			).sort()[0] === this.userId
		;

		handlers.onOpen(this.isAlice);

		if (this.isAlice) {
			util.retryUntilSuccessful(() =>
				this.usersRef.on('child_added', snapshot => {
					if (!snapshot) {
						return;
					}

					if (!this.isConnected && snapshot.key !== this.userId) {
						this.isConnected	= true;
						handlers.onConnect();
					}
				})
			);
		}
		else {
			handlers.onConnect();
		}

		util.retryUntilSuccessful(() =>
			this.channelRef.on('value', snapshot => {
				if (!snapshot) {
					return;
				}

				if (!snapshot.exists()) {
					this.close();
				}
			})
		);

		util.retryUntilSuccessful(() =>
			this.messagesRef.on('child_added', snapshot => {
				if (!snapshot) {
					return;
				}

				const o: {
					chunkIndex: number;
					cyphertext: string;
					id: string;
					numChunks: number;
					sender: string;
					timestamp: number;
				}	=
					snapshot.val()
				;

				if (o.sender === this.userId) {
					return;
				}

				const incomingMessage	= util.getOrSetDefault(
					this.incomingMessages,
					o.id,
					() => new Map<number, string>()
				);

				incomingMessage.set(o.chunkIndex, o.cyphertext);

				if (incomingMessage.size !== o.numChunks) {
					return;
				}

				const message	= Array.from(incomingMessage.keys()).
					sort((a, b) => a - b).
					map(k => incomingMessage.get(k)).
					join('')
				;

				this.incomingMessages.delete(o.id);
				handlers.onMessage(message);
			})
		);
	}

	/** Indicates whether this channel is available for sending and receiving. */
	public get isAlive () : boolean {
		return !this.isClosed;
	}

	/** @see DatabaseService.lock */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		if (!this.databaseLock) {
			throw new Error('Channel lock not setup.');
		}

		return this.databaseService.lock(this.databaseLock, f, reason);
	}

	/** Sends message through this channel. */
	public async send (message: string) : Promise<void> {
		try {
			await this.sendLock(async () => {
				if (this.isClosed) {
					return;
				}

				const id		= util.uuid();
				const numChunks	= Math.ceil(message.length / this.chunkSize);

				for (let chunkIndex = 0 ; chunkIndex < numChunks ; ++chunkIndex) {
					await util.retryUntilSuccessful(async () => this.messagesRef.push({
						chunkIndex,
						cyphertext: message.substr(chunkIndex * this.chunkSize, this.chunkSize),
						id,
						numChunks,
						sender: this.userId,
						timestamp: await this.databaseService.timestamp()
					}));
				}
			});
		}
		catch (err) {
			this.errorService.log('Failed to send.');
			throw err;
		}
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly errorService: ErrorService
	) {}
}
