import {EventManager} from '../eventmanager';
import {Thread} from '../thread';
import {Util} from '../util';
import {Events, RPCEvents, ThreadedSessionEvents} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';


/**
 * Wrapper around Session that spawns it in a new thread.
 */
export class ThreadedSession implements ISession {
	/** @ignore */
	private thread: Thread;

	/** @inheritDoc */
	public state	= {
		cyphId: <string> '',
		isAlice: <boolean> false,
		isAlive: <boolean> true,
		isStartingNewCyph: <boolean> false,
		sharedSecret: <string> '',
		wasInitiatedByAPI: <boolean> false
	};

	/** @inheritDoc */
	public close () : void {
		this.trigger(ThreadedSessionEvents.close);
	}

	/** @inheritDoc */
	public off (event: string, handler: Function) : void {
		EventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on (event: string, handler: Function) : void {
		EventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public receive (data: string) : void {
		this.trigger(ThreadedSessionEvents.receive, {data});
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	/** @inheritDoc */
	public sendBase (messages: IMessage[]) : void {
		this.trigger(ThreadedSessionEvents.send, {messages});
	}

	/** @inheritDoc */
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.trigger(ThreadedSessionEvents.sendText, {text, selfDestructTimeout});
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		EventManager.trigger(event + this.id, data);
	}

	/** @inheritDoc */
	public updateState (key: string, value: any) : void {
		this.trigger(ThreadedSessionEvents.updateState, {key, value});
	}

	/**
	 * @param descriptor Descriptor used for brokering the session.
	 * @param nativeCrypto
	 * @param id
	 */
	constructor (
		descriptor?: string,

		nativeCrypto: boolean = false,

		/** @ignore */
		private id: string = Util.generateGuid()
	) {
		this.on(
			ThreadedSessionEvents.updateStateThread,
			(e: {key: string; value: any}) => {
				this.state[e.key]	= e.value;
			}
		);

		this.thread	= new Thread(
			/* tslint:disable-next-line:only-arrow-functions */
			function (
				/* tslint:disable-next-line:variable-name */
				Session: any,
				locals: any,
				importScripts: Function
			) : void {
				importScripts('/js/cyph/session/session.js');

				const session: ISession	= new Session(
					locals.descriptor,
					locals.nativeCrypto,
					locals.id
				);

				session.on(locals.events.close, () =>
					session.close()
				);

				session.on(locals.events.receive, (e: {data: string}) =>
					session.receive(e.data)
				);

				session.on(locals.events.send, (e: {messages: IMessage[]}) =>
					session.sendBase(e.messages)
				);

				session.on(locals.events.sendText, (e: {
					text: string;
					selfDestructTimeout?: number;
				}) =>
					session.sendText(e.text, e.selfDestructTimeout)
				);

				session.on(locals.events.updateState, (e: {key: string; value: any}) =>
					session.updateState(e.key, e.value)
				);
			},
			{
				descriptor,
				nativeCrypto,
				events: ThreadedSessionEvents,
				id: this.id
			}
		);
	}
}
