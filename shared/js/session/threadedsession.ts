/// <reference path="ip2p.ts" />
/// <reference path="isession.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../eventmanager.ts" />
/// <reference path="../thread.ts" />
/// <reference path="../util.ts" />


module Session {
	export class ThreadedSession implements ISession {
		public static methods	= {
			close: 'close ThreadedSession',
			receive: 'receive ThreadedSession',
			send: 'send ThreadedSession',
			updateState: 'updateState ThreadedSession',
			updateStateThread: 'updateStateThread ThreadedSession'
		};


		private id: string;
		private thread: Thread;

		public state	= {
			cyphId: <string> '',
			sharedSecret: <string> '',
			hasKeyExchangeBegun: <boolean> false,
			isAlive: <boolean> true,
			isCreator: <boolean> false,
			isStartingNewCyph: <boolean> false
		};

		public p2p: IP2P;

		public constructor (descriptor?: string, p2p?: IP2P, id: string = Util.generateGuid()) {
			this.id	= id;


			this.thread	= new Thread((vars: any, importScripts: Function, Session: any) => {
				importScripts('/cryptolib/bower_components/otr4-em/build/otr-web.js');
				importScripts('/js/session/session.js');

				let session: ISession	= new Session.Session(vars.descriptor, null, vars.id);

				session.on(vars.methods.close, (e: { shouldSendEvent: boolean; }) =>
					session.close(e.shouldSendEvent)
				);

				session.on(vars.methods.receive, (e: { data: string; }) =>
					session.receive(e.data)
				);

				session.on(vars.methods.send, (e: { messages: Message[]; }) =>
					session.sendBase(e.messages)
				);

				session.on(vars.methods.updateState, (e: { key: string; value: any; }) =>
					session.updateState(e.key, e.value)
				);
			}, {
				descriptor,
				id: this.id,
				methods: ThreadedSession.methods
			});

			this.on(
				ThreadedSession.methods.updateStateThread,
				(e: { key: string; value: any; }) => {
					this.state[e.key]	= e.value;
					Controller.update();
				}
			);


			if (p2p) {
				this.p2p	= p2p;
				this.p2p.init(this);
			}
		}

		public close (shouldSendEvent: boolean = true) : void {
			this.trigger(ThreadedSession.methods.close, {shouldSendEvent});
			setTimeout(this.thread.stop, 120000);
		}

		public off (event: string, handler: Function) : void {
			EventManager.off(event + this.id, handler);
		}

		public on (event: string, handler: Function) : void {
			EventManager.on(event + this.id, handler);
		}

		public receive (data: string) : void {
			this.trigger(ThreadedSession.methods.receive, {data});
		}

		public send (...messages: Message[]) : void {
			this.sendBase(messages);
		}

		public sendBase (messages: Message[]) : void {
			this.trigger(ThreadedSession.methods.send, {messages});
		}

		public trigger (event: string, data?: any) : void {
			EventManager.trigger(event + this.id, data);
		}

		public updateState (key: string, value: any) : void {
			this.trigger(ThreadedSession.methods.updateState, {key, value});
		}
	}
}
