import {Events, RPCEvents, ThreadedSessionEvents} from 'enums';
import {IMessage} from 'imessage';
import {ISession} from 'isession';
import {EventManager} from 'cyph/eventmanager';
import {IController} from 'cyph/icontroller';
import {Thread} from 'cyph/thread';
import {Util} from 'cyph/util';
import * as Channel from 'channel/channel';


/**
 * Wrapper around Session that spawns it in a new thread.
 */
export class ThreadedSession implements ISession {
	private thread: Thread;
	private outQueue: Channel.Queue;

	public state	= {
		cyphId: <string> '',
		sharedSecret: <string> '',
		isAlive: <boolean> true,
		isCreator: <boolean> false,
		isStartingNewCyph: <boolean> false,
		wasInitiatedByAPI: <boolean> false
	};

	public close (shouldSendEvent: boolean = true) : void {
		/* Synchronously destroy in main thread, because
			onunload won't wait on cross-thread messages */
		if (shouldSendEvent && this.outQueue) {
			this.outQueue.send(RPCEvents.destroy, undefined, true);
		}

		this.trigger(ThreadedSessionEvents.close, {shouldSendEvent});
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

		this.on(
			Events.newChannel,
			(e: { queueName: string; region: string; }) =>
				this.outQueue	= new Channel.Queue(
					e.queueName,
					undefined,
					{region: e.region}
				)
		);

		this.thread	= new Thread((locals: any, importScripts: Function) => {
			importScripts('/lib/js/crypto/libsodium/dist/browsers-sumo/combined/sodium.min.js');
			importScripts('/lib/js/crypto/ntru/dist/ntru.js');

			importScripts('/lib/js/aws/aws-sdk-js/aws-sdk.min.js');
			importScripts('/lib/js/aws-xml.js');
			self['AWS'].XML.Parser	= self['AWS_XML'];

			importScripts('/js/cyph/session/session.js');

			System.import('cyph/session/session').then(Session => {
				const session: ISession	= new Session.Session(
					locals.descriptor,
					locals.nativeCrypto,
					null,
					locals.id
				);

				session.on(locals.events.close, (e: { shouldSendEvent: boolean; }) =>
					session.close(e.shouldSendEvent)
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
