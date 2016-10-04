import {IChannel} from './ichannel';
import {LocalChannel} from './localchannel';
import {Config} from '../config';
import {Firebase} from '../firebase';
import {Util} from '../util';


export {
	IChannel,
	LocalChannel
};


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
		this.channelRef.remove();
	}

	public isAlive () : boolean {
		return !this.isClosed;
	}

	public send (message: string) : void {
		this.messagesRef.push({
			cyphertext: message,
			sender: this.userId,
			timestamp: Util.timestamp()
		});
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
		this.channelRef		= Firebase.app.database().ref('channels').child(channelName);
		this.messagesRef	= this.channelRef.child('messages');
		this.usersRef		= this.channelRef.child('users');

		this.isAlice		= !(await this.usersRef.once('value')).hasChildren();
		this.userId			= Util.generateGuid();

		this.channelRef.onDisconnect().remove();
		this.usersRef.child(this.userId).set(this.userId);

		if (handlers.onopen) {
			handlers.onopen(this.isAlice);
		}

		if (handlers.onconnect) {
			if (this.isAlice) {
				this.usersRef.on('child_added', snapshot => {
					if (!this.isConnected && snapshot.val() !== this.userId) {
						this.isConnected	= true;
						handlers.onconnect();
					}
				});
			}
			else {
				handlers.onconnect();
			}
		}

		if (handlers.onclose) {
			this.channelRef.on('value', snapshot => {
				if (!snapshot.exists() && !this.isClosed) {
					this.isClosed	= true;
					handlers.onclose();
				}
			});
		}

		if (handlers.onmessage) {
			this.messagesRef.on('child_added', snapshot => {
				const o	= snapshot.val();
				if (o.sender !== this.userId) {
					handlers.onmessage(o.cyphertext);
				}
			});
		}
	})() }
}
