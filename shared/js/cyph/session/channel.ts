import {firebaseApp} from '../firebase-app';
import {util} from '../util';


/**
 * Bidirectional network connection that sends and receives data (via Firebase).
 */
export class Channel {
	/** @ignore */
	private channelRef: firebase.database.Reference;

	/** @ignore */
	private messagesRef: firebase.database.Reference;

	/** @ignore */
	private usersRef: firebase.database.Reference;

	/** @ignore */
	private userId: string;

	/** @ignore */
	private isClosed: boolean		= false;

	/** @ignore */
	private isConnected: boolean	= false;

	/** @ignore */
	private isAlice: boolean		= false;

	/** This kills the channel. */
	public close () : void {
		this.channelRef.remove().catch(() => {});
	}

	/** Indicates whether this channel is available for sending and receiving. */
	public get isAlive () : boolean {
		return !this.isClosed;
	}

	/** Sends message through this channel. */
	public send (message: string) : void {
		util.retryUntilSuccessful(async () =>
			this.messagesRef.push({
				cyphertext: message,
				sender: this.userId,
				timestamp: util.timestamp()
			}).then(
				() => {}
			)
		);
	}

	/**
	 * @param channelName Name of this channel.
	 * @param handlers Event handlers for this channel.
	 */
	constructor (
		channelName: string,
		handlers: ({
			onClose?: () => void;
			onConnect?: () => void;
			onMessage?: (message: string) => void;
			onOpen?: (isAlice: boolean) => void;
		}) = {}
	) { (async () => {
		this.channelRef		= await util.retryUntilSuccessful(async () =>
			(await firebaseApp).database().ref('channels').child(channelName)
		);

		this.messagesRef	= await util.retryUntilSuccessful(() =>
			this.channelRef.child('messages')
		);
		this.usersRef		= await util.retryUntilSuccessful(() =>
			this.channelRef.child('users')
		);

		const userRef: firebase.database.ThenableReference	=
			await util.retryUntilSuccessful(() => this.usersRef.push(''))
		;

		this.userId			= userRef.key || '';

		util.retryUntilSuccessful(async () => userRef.set(this.userId));

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

		if (handlers.onOpen) {
			handlers.onOpen(this.isAlice);
		}

		if (handlers.onConnect) {
			const onConnect	= handlers.onConnect;

			if (this.isAlice) {
				util.retryUntilSuccessful(() =>
					this.usersRef.on('child_added', (snapshot: firebase.database.DataSnapshot) => {
						if (!this.isConnected && snapshot.key !== this.userId) {
							this.isConnected	= true;
							onConnect();
						}
					})
				);
			}
			else {
				onConnect();
			}
		}

		if (handlers.onClose) {
			const onClose	= handlers.onClose;

			util.retryUntilSuccessful(() =>
				this.channelRef.on('value', async (snapshot: firebase.database.DataSnapshot) => {
					if (await util.retryUntilSuccessful(() =>
						!snapshot.exists() && !this.isClosed
					)) {
						this.isClosed	= true;
						onClose();
					}
				})
			);
		}

		if (handlers.onMessage) {
			const onMessage	= handlers.onMessage;

			util.retryUntilSuccessful(() =>
				this.messagesRef.on('child_added', async (snapshot: firebase.database.DataSnapshot) => {
					const o	= await util.retryUntilSuccessful(() =>
						snapshot.val()
					);

					if (o.sender !== this.userId) {
						onMessage(o.cyphertext);
					}
				})
			);
		}
	})(); }
}
