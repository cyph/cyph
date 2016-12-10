import {eventManager} from '../eventmanager';
import {Thread} from '../thread';
import {util} from '../util';
import {threadedSessionEvents} from './enums';
import {IMessage} from './imessage';
import {ISession} from './isession';


/**
 * Wrapper around Session that spawns it in a new thread.
 */
export class ThreadedSession implements ISession {
	/** @ignore */
	private readonly thread: Thread;

	/** @inheritDoc */
	public readonly state	= {
		cyphId: <string> '',
		isAlice: <boolean> false,
		isAlive: <boolean> true,
		isStartingNewCyph: <boolean> false,
		sharedSecret: <string> '',
		wasInitiatedByAPI: <boolean> false
	};

	/** @inheritDoc */
	public close () : void {
		this.trigger(threadedSessionEvents.close);
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.id);
	}

	/** @inheritDoc */
	public async receive (data: string) : Promise<void> {
		this.trigger(threadedSessionEvents.receive, {data});
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.sendBase(messages);
	}

	/** @inheritDoc */
	public async sendBase (messages: IMessage[]) : Promise<void> {
		this.trigger(threadedSessionEvents.send, {messages});
	}

	/** @inheritDoc */
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.trigger(threadedSessionEvents.sendText, {text, selfDestructTimeout});
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.id, data);
	}

	/** @inheritDoc */
	public updateState (key: string, value: any) : void {
		this.trigger(threadedSessionEvents.updateState, {key, value});
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
		private readonly id: string = util.generateGuid()
	) {
		this.on(
			threadedSessionEvents.updateStateThread,
			(e: {key: string; value: any}) => {
				(<any> this.state)[e.key]	= e.value;
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
				events: threadedSessionEvents,
				id: this.id
			}
		);
	}
}
