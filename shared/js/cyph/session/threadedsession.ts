/// <reference path="enums.ts" />
/// <reference path="imessage.ts" />
/// <reference path="isession.ts" />


module Cyph {
	export module Session {
		export class ThreadedSession implements ISession {
			private id: string;
			private controller: IController;
			private thread: Thread;

			public state	= {
				cyphId: <string> '',
				sharedSecret: <string> '',
				isAlive: <boolean> true,
				isCreator: <boolean> false,
				isStartingNewCyph: <boolean> false
			};

			public constructor (descriptor?: string, controller?: IController, id: string = Util.generateGuid()) {
				this.controller	= controller;
				this.id			= id;


				this.on(
					ThreadedSessionEvents.updateStateThread,
					(e: { key: string; value: any; }) => {
						this.state[e.key]	= e.value;

						if (this.controller) {
							this.controller.update();
						}
					}
				);

				this.thread	= new Thread((vars: any, importScripts: Function, Cyph: any) => {
					importScripts('/cryptolib/bower_components/otr4-em/build/otr-web.js');

					importScripts('/lib/bower_components/aws-sdk-js/dist/aws-sdk.min.js');
					importScripts('/lib/aws-xml.js');
					self['AWS'].XML.Parser	= self['AWS_XML'];

					(() => {
						importScripts('/js/cyph/session/session.js');

						let session: ISession	= new Cyph.Session.Session(
							vars.descriptor,
							null,
							vars.id
						);

						session.on(vars.events.close, (e: { shouldSendEvent: boolean; }) =>
							session.close(e.shouldSendEvent)
						);

						session.on(vars.events.receive, (e: { data: string; }) =>
							session.receive(e.data)
						);

						session.on(vars.events.send, (e: { messages: IMessage[]; }) =>
							session.sendBase(e.messages)
						);

						session.on(vars.events.sendText, (e: { text: string; }) =>
							session.sendText(e.text)
						);

						session.on(vars.events.updateState, (e: { key: string; value: any; }) =>
							session.updateState(e.key, e.value)
						);
					})();
				}, {
					descriptor,
					id: this.id,
					events: ThreadedSessionEvents
				});
			}

			public close (shouldSendEvent: boolean = true) : void {
				this.trigger(ThreadedSessionEvents.close, {shouldSendEvent});
				setTimeout(() => this.thread.stop(), 120000);
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
		}
	}
}
