/// <reference path="ip2p.ts" />
/// <reference path="isession.ts" />
/// <reference path="../eventmanager.ts" />
/// <reference path="../icontroller.ts" />
/// <reference path="../thread.ts" />
/// <reference path="../util.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module Session {
		export class ThreadedSession implements ISession {
			public static events	= {
				close: 'ThreadedSessionClose',
				receive: 'ThreadedSessionReceive',
				send: 'ThreadedSessionSend',
				updateState: 'ThreadedSessionUpdateState',
				updateStateThread: 'ThreadedSessionUpdateStateThread'
			};


			private id: string;
			private controller: IController;
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

			public constructor (descriptor?: string, controller?: IController, p2p?: IP2P, id: string = Util.generateGuid()) {
				this.controller	= controller;
				this.p2p		= p2p;
				this.id			= id;


				this.thread	= new Thread((vars: any, importScripts: Function, Cyph: any) => {
					importScripts('/cryptolib/bower_components/otr4-em/build/otr-web.js');
					importScripts('/js/cyph/session/session.js');

					let session: ISession	= new Cyph.Session.Session(vars.descriptor, null, null, vars.id);

					session.on(vars.events.close, (e: { shouldSendEvent: boolean; }) =>
						session.close(e.shouldSendEvent)
					);

					session.on(vars.events.receive, (e: { data: string; }) =>
						session.receive(e.data)
					);

					session.on(vars.events.send, (e: { messages: Message[]; }) =>
						session.sendBase(e.messages)
					);

					session.on(vars.events.updateState, (e: { key: string; value: any; }) =>
						session.updateState(e.key, e.value)
					);
				}, {
					descriptor,
					id: this.id,
					events: ThreadedSession.events
				});

				this.on(
					ThreadedSession.events.updateStateThread,
					(e: { key: string; value: any; }) => {
						this.state[e.key]	= e.value;
						this.controller.update();
					}
				);


				if (this.p2p) {
					this.p2p.init(this);
				}
			}

			public close (shouldSendEvent: boolean = true) : void {
				this.trigger(ThreadedSession.events.close, {shouldSendEvent});
				setTimeout(this.thread.stop, 120000);
			}

			public off (event: string, handler: Function) : void {
				EventManager.off(event + this.id, handler);
			}

			public on (event: string, handler: Function) : void {
				EventManager.on(event + this.id, handler);
			}

			public receive (data: string) : void {
				this.trigger(ThreadedSession.events.receive, {data});
			}

			public send (...messages: Message[]) : void {
				this.sendBase(messages);
			}

			public sendBase (messages: Message[]) : void {
				this.trigger(ThreadedSession.events.send, {messages});
			}

			public trigger (event: string, data?: any) : void {
				EventManager.trigger(event + this.id, data);
			}

			public updateState (key: string, value: any) : void {
				this.trigger(ThreadedSession.events.updateState, {key, value});
			}
		}
	}
}
