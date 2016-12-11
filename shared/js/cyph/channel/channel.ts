import {firebaseApp} from '../firebaseapp';
import {util} from '../util';
import {IChannel} from './ichannel';


/**
 * Standard IChannel implementation built on Firebase.
 */
export class Channel implements IChannel {
	/** @ignore */
	private isClosed: boolean		= false;

	/** @ignore */
	private isConnected: boolean	= false;

	/** @ignore */
	private isAlice: boolean		= false;

	/** @ignore */
	private channelRef: firebase.DatabaseReference;

	/** @ignore */
	private messagesRef: firebase.DatabaseReference;

	/** @ignore */
	private usersRef: firebase.DatabaseReference;

	/** @ignore */
	private userId: string;

	/** @inheritDoc */
	public close () : void {
		util.retryUntilSuccessful(async () => this.channelRef.remove());
	}

	/** @inheritDoc */
	public isAlive () : boolean {
		return !this.isClosed;
	}

	/** @inheritDoc */
	public send (message: string) : void {
		util.retryUntilSuccessful(() => this.messagesRef.push({
			cyphertext: message,
			sender: this.userId,
			timestamp: util.timestamp()
		}));
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

		const userRef		= await util.retryUntilSuccessful(() =>
			this.usersRef.push('')
		);

		this.userId			= userRef.key;

		util.retryUntilSuccessful(() => userRef.set(this.userId));

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
			if (this.isAlice) {
				util.retryUntilSuccessful(() =>
					this.usersRef.on('child_added', (snapshot: firebase.DataSnapshot) => {
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
		}

		if (handlers.onClose) {
			util.retryUntilSuccessful(() =>
				this.channelRef.on('value', async (snapshot: firebase.DataSnapshot) => {
					if (await util.retryUntilSuccessful(() =>
						!snapshot.exists() && !this.isClosed
					)) {
						this.isClosed	= true;
						handlers.onClose();
					}
				})
			);
		}

		if (handlers.onMessage) {
			util.retryUntilSuccessful(() =>
				this.messagesRef.on('child_added', async (snapshot: firebase.DataSnapshot) => {
					const o	= await util.retryUntilSuccessful(() =>
						snapshot.val()
					);

					if (o.sender !== this.userId) {
						handlers.onMessage(o.cyphertext);
					}
				})
			);
		}
	})(); }
}
