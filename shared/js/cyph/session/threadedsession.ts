import {Events, RPCEvents, ThreadedSessionEvents} from 'enums';
import {IMessage} from 'imessage';
import {ISession} from 'isession';
import {EventManager} from 'cyph/eventmanager';
import {IController} from 'cyph/icontroller';
import {Thread} from 'cyph/thread';
import {Util} from 'cyph/util';


/**
 * Wrapper around Session that spawns it in a new thread.
 */
export class ThreadedSession implements ISession {
	private thread: Thread;

	public state	= {
		cyphId: <string> '',
		sharedSecret: <string> '',
		isAlive: <boolean> true,
		isCreator: <boolean> false,
		isStartingNewCyph: <boolean> false,
		wasInitiatedByAPI: <boolean> false
	};

	public close () : void {
		this.trigger(ThreadedSessionEvents.close);
	}

	public off (event: string, handler: Function) : void {
		EventManager.off(event + this.id, handler);
	}

	public on (event: string, handler: Function) : void {
		EventManager.on(event + this.id, handler);
	}

	public receive (data: string) : void {
		this.trigger(ThreadedSessionEvents.receive, {data});
	}

	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	public sendBase (messages: IMessage[]) : void {
		this.trigger(ThreadedSessionEvents.send, {messages});
	}

	public sendText (text: string) : void {
		this.trigger(ThreadedSessionEvents.sendText, {text});
	}

	public trigger (event: string, data?: any) : void {
		EventManager.trigger(event + this.id, data);
	}

	public updateState (key: string, value: any) : void {
		this.trigger(ThreadedSessionEvents.updateState, {key, value});
	}

	/**
	 * @param descriptor Descriptor used for brokering the session.
	 * @param controller
	 * @param id
	 */
	public constructor (
		descriptor?: string,
		nativeCrypto: boolean = false,
		private controller?: IController,
		private id: string = Util.generateGuid()
	) {
		this.on(
			ThreadedSessionEvents.updateStateThread,
			(e: { key: string; value: any; }) => {
				this.state[e.key]	= e.value;

				if (this.controller) {
					this.controller.update();
				}
			}
		);

		this.thread	= new Thread((locals: any, importScripts: Function) => {
			importScripts('/js/cyph/session/session.js');

			System.import('cyph/session/session').then(Session => {
				const session: ISession	= new Session.Session(
					locals.descriptor,
					locals.nativeCrypto,
					null,
					locals.id
				);

				session.on(locals.events.close, () =>
					session.close()
				);

				session.on(locals.events.receive, (e: { data: string; }) =>
					session.receive(e.data)
				);

				session.on(locals.events.send, (e: { messages: IMessage[]; }) =>
					session.sendBase(e.messages)
				);

				session.on(locals.events.sendText, (e: { text: string; }) =>
					session.sendText(e.text)
				);

				session.on(locals.events.updateState, (e: { key: string; value: any; }) =>
					session.updateState(e.key, e.value)
				);
			});
		}, {
			descriptor,
			nativeCrypto,
			id: this.id,
			events: ThreadedSessionEvents
		});
	}
}
