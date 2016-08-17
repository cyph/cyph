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
	private isClosed: boolean	= false;
	private isOpen: boolean		= false;

	private channelId: string;
	private messagesId: string;

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
				push: { args: [message]}
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
		this.channelId				= await Firebase.call({ database: {
			ref: { args: ['channels'],
			child: { args: [channelName]}}
		}});

		const usersId: string		= await Firebase.call({ returnValue: {
			id: this.channelId,
			command: {
				child: { args: ['users']}
			}
		}});

		const isCreator: boolean	= await new Promise<boolean>(resolve =>
			Firebase.call({ returnValue: {
				id: usersId,
				command: {
					once: { args: [
						'value',
						snapshot => resolve(!snapshot.hasChildren)
					]}
				}
			}})
		);

		const userId: string		= Util.generateGuid();

		Firebase.call({ returnValue: {
			id: usersId,
			command: {
				child: { args: [userId],
				set: { args: [userId]}}
			}
		}});

		if (handlers.onopen) {
			Firebase.call({ returnValue: {
				id: usersId,
				command: {
					on: { args: [
						'child_added',
						snapshot => {
							if (!this.isOpen && snapshot.val !== userId) {
								this.isOpen	= true;
								handlers.onopen(isCreator);
							}
						}
					]}
				}
			}});
		}

		if (handlers.onconnect) {
			handlers.onconnect();
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
						'value',
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

		this.messagesId				= await Firebase.call({ returnValue: {
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
						snapshot => handlers.onmessage(snapshot.val)
					]}
				}
			}});
		}
	})() }
}
