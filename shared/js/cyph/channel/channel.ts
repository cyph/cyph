import {IChannel} from 'ichannel';
import {LocalChannel} from 'localchannel';
import {Config} from 'cyph/config';
import {Firebase} from 'cyph/firebase';
import {Util} from 'cyph/util';


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
	private isCreator: boolean		= false;

	private channelId: string;
	private messagesId: string;
	private userId: string;
	private usersId: string;

	public close () : void {
		Firebase.call({ returnValue: {
			id: this.channelId,
			command: {
				remove: {}
			}
		}});
	}

	public isAlive () : boolean {
		return !this.isClosed;
	}

	public send (message: string) : void {
		Firebase.call({ returnValue: {
			id: this.messagesId,
			command: {
				push: { args: [{
					cyphertext: message,
					sender: this.userId,
					timestamp: Date.now()
				}]}
			}
		}});
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
			onopen?: (isCreator: boolean) => void;
		}) = {}
	) { (async () => {
		this.channelId	= await Firebase.call({ database: {
			ref: { args: ['channels'],
			child: { args: [channelName]}}
		}});

		this.usersId	= await Firebase.call({ returnValue: {
			id: this.channelId,
			command: {
				child: { args: ['users']}
			}
		}});

		this.isCreator	= await new Promise<boolean>(resolve =>
			Firebase.call({ returnValue: {
				id: this.usersId,
				command: {
					once: { args: [
						'value',
						snapshot => resolve(!snapshot.hasChildren)
					]}
				}
			}})
		);

		this.userId		= Util.generateGuid();

		Firebase.call({ returnValue: {
			id: this.usersId,
			command: {
				child: { args: [this.userId],
				set: { args: [this.userId]}}
			}
		}});

		if (handlers.onopen) {
			handlers.onopen(this.isCreator);
		}

		if (handlers.onconnect) {
			if (this.isCreator) {
				Firebase.call({ returnValue: {
					id: this.usersId,
					command: {
						on: { args: [
							'child_added',
							snapshot => {
								if (!this.isConnected && snapshot.val !== this.userId) {
									this.isConnected	= true;
									handlers.onconnect();
								}
							}
						]}
					}
				}});
			}
			else {
				handlers.onconnect();
			}
		}

		Firebase.call({ returnValue: {
			id: this.channelId,
			command: {
				onDisconnect: {
				remove: {}}
			}
		}});

		if (handlers.onclose) {
			Firebase.call({ returnValue: {
				id: this.channelId,
				command: {
					on: { args: [
						'child_removed',
						snapshot => {
							if (!snapshot.exists && !this.isClosed) {
								this.isClosed	= true;
								handlers.onclose();
							}
						}
					]}
				}
			}});
		}

		this.messagesId	= await Firebase.call({ returnValue: {
			id: this.channelId,
			command: {
				child: { args: ['messages']}
			}
		}});

		if (handlers.onmessage) {
			Firebase.call({ returnValue: {
				id: this.messagesId,
				command: {
					on: { args: [
						'child_added',
						snapshot => {
							if (snapshot.val.sender !== this.userId) {
								handlers.onmessage(snapshot.val.cyphertext);
							}
						}
					]}
				}
			}});
		}
	})() }
}
