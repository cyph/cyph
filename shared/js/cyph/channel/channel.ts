import {IChannel} from './ichannel';
import {Config} from '../config';
import {Firebase} from '../firebase';
import {Util} from '../util';


/**
 * Standard IChannel implementation built on Firebase.
 */
export class Channel implements IChannel {
	private isClosed: boolean		= false;
	private isConnected: boolean	= false;
	private isAlice: boolean		= false;

	private channelRef: firebase.DatabaseReference;
	private messagesRef: firebase.DatabaseReference;
	private usersRef: firebase.DatabaseReference;
	private userId: string;

	public close () : void {
		Util.retryUntilSuccessful(() => this.channelRef.remove());
	}

	public isAlive () : boolean {
		return !this.isClosed;
	}

	public send (message: string) : void {
		Util.retryUntilSuccessful(() => this.messagesRef.push({
			cyphertext: message,
			sender: this.userId,
			timestamp: Util.timestamp()
		}));
	}

	/**
	 * @param channelName Name of this channel.
	 * @param handlers Event handlers for this channel.
	 */
	public constructor (
		channelName: string,
		handlers: ({
			onclose?: () => void;
			onconnect?: () => void;
			onmessage?: (message: string) => void;
			onopen?: (isAlice: boolean) => void;
		}) = {}
	) { (async () => {
		this.channelRef		= await Util.retryUntilSuccessful(() =>
			Firebase.app.database().ref('channels').child(channelName)
		);

		this.messagesRef	= await Util.retryUntilSuccessful(() =>
			this.channelRef.child('messages')
		);
		this.usersRef		= await Util.retryUntilSuccessful(() =>
			this.channelRef.child('users')
		);

		const userRef		= await Util.retryUntilSuccessful(() =>
			this.usersRef.push('')
		);

		this.userId			= userRef.key;

		Util.retryUntilSuccessful(() => userRef.set(this.userId));

		this.isAlice		=
			Object.keys(
				await Util.retryUntilSuccessful(async () =>
					(await this.usersRef.once('value')).val()
				)
			).sort()[0] === this.userId
		;

		Util.retryUntilSuccessful(() =>
			this.channelRef.onDisconnect().remove()
		);

		if (handlers.onopen) {
			handlers.onopen(this.isAlice);
		}

		if (handlers.onconnect) {
			if (this.isAlice) {
				Util.retryUntilSuccessful(() =>
					this.usersRef.on('child_added', snapshot => {
						if (!this.isConnected && snapshot.key !== this.userId) {
							this.isConnected	= true;
							handlers.onconnect();
						}
					})
				);
			}
			else {
				handlers.onconnect();
			}
		}

		if (handlers.onclose) {
			Util.retryUntilSuccessful(() =>
				this.channelRef.on('value', async (snapshot) => {
					if (await Util.retryUntilSuccessful(() =>
						!snapshot.exists() && !this.isClosed
					)) {
						this.isClosed	= true;
						handlers.onclose();
					}
				})
			);
		}

		if (handlers.onmessage) {
			Util.retryUntilSuccessful(() =>
				this.messagesRef.on('child_added', async (snapshot) => {
					const o	= await Util.retryUntilSuccessful(() =>
						snapshot.val()
					);

					if (o.sender !== this.userId) {
						handlers.onmessage(o.cyphertext);
					}
				})
			);
		}
	})() }
}
