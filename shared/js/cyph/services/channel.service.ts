import {Injectable} from '@angular/core';
import {errors} from '../errors';
import {util} from '../util';
import {DatabaseService} from './database.service';


/**
 * Bidirectional network connection that sends and receives data (via Firebase).
 */
@Injectable()
export class ChannelService {
	/** @ignore */
	private channelRef: firebase.database.Reference;

	/** @ignore */
	private handlers: {
		onClose: () => void;
		onConnect: () => void;
		onMessage: (message: string) => void;
		onOpen: (isAlice: boolean) => void;
	};

	/** @ignore */
	private isAlice: boolean		= false;

	/** @ignore */
	private isClosed: boolean		= false;

	/** @ignore */
	private isConnected: boolean	= false;

	/** @ignore */
	private messagesRef: firebase.database.Reference;

	/** @ignore */
	private userId: string;

	/** @ignore */
	private usersRef: firebase.database.Reference;

	/** This kills the channel. */
	public close () : void {
		if (this.isClosed) {
			return;
		}

		this.isClosed	= true;

		this.handlers.onClose();
		this.channelRef.remove().catch(() => {});
	}

	/**
	 * Initializes service.
	 * @param channelName Name of this channel.
	 * @param handlers Event handlers for this channel.
	 */
	public async init (
		channelName: string,
		handlers: {
			onClose: () => void;
			onConnect: () => void;
			onMessage: (message: string) => void;
			onOpen: (isAlice: boolean) => void;
		}
	) : Promise<void> {
		this.handlers		= handlers;

		this.channelRef		=
			(await this.databaseService.getDatabaseRef('channels')).child(channelName)
		;

		this.messagesRef	= this.channelRef.child('messages');
		this.usersRef		= this.channelRef.child('users');

		const userRef: firebase.database.ThenableReference	=
			await util.retryUntilSuccessful(() => this.usersRef.push(''))
		;

		this.userId			= userRef.key || '';

		await util.retryUntilSuccessful(async () => userRef.set(this.userId));

		this.isAlice		=
			Object.keys(
				await util.retryUntilSuccessful(async () =>
					(await this.usersRef.once('value')).val()
				)
			).sort()[0] === this.userId
		;

		util.retryUntilSuccessful(async () =>
			this.channelRef.onDisconnect().remove()
		);

		this.handlers.onOpen(this.isAlice);

		if (this.isAlice) {
			util.retryUntilSuccessful(() =>
				this.usersRef.on('child_added', (snapshot: firebase.database.DataSnapshot) => {
					if (!this.isConnected && snapshot.key !== this.userId) {
						this.isConnected	= true;
						this.handlers.onConnect();
					}
				})
			);
		}
		else {
			this.handlers.onConnect();
		}

		util.retryUntilSuccessful(() =>
			this.channelRef.on('value', (snapshot: firebase.database.DataSnapshot) => {
				if (!snapshot.exists()) {
					this.close();
				}
			})
		);

		util.retryUntilSuccessful(() =>
			this.messagesRef.on('child_added', (snapshot: firebase.database.DataSnapshot) => {
				const o: any	= snapshot.val();

				if (o.sender !== this.userId) {
					this.handlers.onMessage(o.cyphertext);
				}
			})
		);
	}

	/** Indicates whether this channel is available for sending and receiving. */
	public get isAlive () : boolean {
		return !this.isClosed;
	}

	/** Sends message through this channel. */
	public async send (message: string) : Promise<void> {
		try {
			await util.retryUntilSuccessful(async () => {
				if (this.isClosed) {
					return;
				}

				await this.messagesRef.push({
					cyphertext: message,
					sender: this.userId,
					timestamp: util.timestamp()
				});
			});
		}
		catch (err) {
			errors.log('Failed to send.');
			throw err;
		}
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
