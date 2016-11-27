import {Env} from './env';
import {IThread} from './ithread';
import {Util} from './util';


/**
 * Global cross-thread event-manager.
 */
export class EventManager {
	/** @ignore */
	private static readonly handlers: {[event: string]: Function[]}				= {};

	/** @ignore */
	private static readonly indices: {[event: string]: Map<Function, number>}	= {};

	/** @ignore */
	private static readonly threadEventPrefix: string	= 'threadEventPrefix';

	/** @ignore */
	private static readonly untriggeredEvents: string	= 'untriggeredEvents';

	/**
	 * @ignore
	 * (Used internally by EventManager and Thread for cross-thread event stuff.)
	 */
	public static readonly mainThreadEvents: string	= 'mainThreadEvents';

	/** List of all active threads. */
	public static readonly threads: IThread[]		= [];

	/**
	 * Sends command to the main thread.
	 * @param method Fully qualified method name (e.g. "Cyph.EventManager.callMainThread").
	 * @param args
	 */
	public static callMainThread (method: string, args: any[] = []) : void {
		if (Env.isMainThread) {
			for (let i = 0 ; i < args.length ; ++i) {
				const callbackId: string	= (args[i] && args[i].callbackId) || '';

				if (callbackId) {
					args[i]	= (...threadArgs: any[]) => EventManager.trigger(
						EventManager.threadEventPrefix + callbackId,
						threadArgs
					);
				}
			}

			const methodSplit: string[]	= method.split('.');
			const methodName: string	= methodSplit.slice(-1)[0];

			/* Validate command against namespace whitelist, then execute */
			if (['cyph', 'ui'].indexOf(methodSplit[0]) > -1) {
				const methodObject: any	= methodSplit.
					slice(0, -1).
					reduce((o: any, k: string) : any => o[k], self)
				;

				methodObject[methodName].apply(methodObject, args);
			}
			else {
				throw new Error(
					`${method} not in whitelist. (args: ${JSON.stringify(args)})`
				);
			}
		}
		else {
			for (let i = 0 ; i < args.length ; ++i) {
				const arg	= args[i];

				if (typeof arg !== 'function') {
					continue;
				}

				const callbackId: string	= Util.generateGuid();

				args[i]	= {callbackId};

				EventManager.on(
					EventManager.threadEventPrefix + callbackId,
					(threadArgs: any[]) => arg.apply(null, threadArgs)
				);
			}

			EventManager.trigger(EventManager.mainThreadEvents, {method, args});
		}
	}

	/**
	 * Removes handler from event.
	 * @param event
	 * @param handler
	 */
	public static off (event: string, handler?: Function) : void {
		if (!EventManager.handlers[event]) {
			return;
		}

		EventManager.handlers[event].splice(EventManager.indices[event].get(handler), 1);
		EventManager.indices[event].delete(handler);

		if (EventManager.handlers[event].length < 1) {
			EventManager.handlers[event]	= null;
			EventManager.indices[event]		= null;
		}
	}

	/**
	 * Attaches handler to event.
	 * @param event
	 * @param handler
	 */
	public static on (event: string, handler: Function) : void {
		if (!EventManager.handlers[event]) {
			EventManager.handlers[event]	= [];
			EventManager.indices[event]		= new Map<Function, number>();
		}

		if (EventManager.indices[event].has(handler)) {
			return;
		}

		EventManager.indices[event].set(
			handler,
			EventManager.handlers[event].push(handler) - 1
		);
	}

	/**
	 * Attaches handler to event and removes after first execution.
	 * @param event
	 * @param handler
	 */
	public static one (event: string, handler: Function) : void {
		let f: Function;
		f	= (data: any) => {
			EventManager.off(event, f);
			handler(data);
		};

		EventManager.on(event, f);
	}

	/**
	 * Triggers event.
	 * @param event
	 * @param data
	 * @param shouldTrigger Ignore this (used internally for cross-thread events).
	 */
	public static trigger (
		event: string,
		data?: any,
		shouldTrigger: boolean = Env.isMainThread
	) : void {
		if (!shouldTrigger) {
			EventManager.trigger(EventManager.untriggeredEvents, {event, data}, true);
		}
		else {
			for (let handler of (EventManager.handlers[event] || [])) {
				try {
					handler(data);
				}
				catch (err) {
					setTimeout(() => { throw err; }, 0);
				}
			}

			if (Env.isMainThread) {
				for (let thread of EventManager.threads) {
					try {
						thread.postMessage({event, data, isThreadEvent: true});
					}
					catch (_) {}
				}
			}
		}
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	private static readonly _	= (() => {
		if (Env.isMainThread) {
			EventManager.on(
				EventManager.mainThreadEvents,
				(o: {method: string; args: any[]}) =>
					EventManager.callMainThread(o.method, o.args)
			);
		}
		else {
			self.onmessage	= (e: MessageEvent) => {
				const data: any	= e.data || {};

				if (data.isThreadEvent) {
					EventManager.trigger(data.event, data.data, true);
				}
				else if (onthreadmessage) {
					onthreadmessage(e);
				}
			};

			EventManager.on(
				EventManager.untriggeredEvents,
				(o: {event: string; data: any}) => self.postMessage(
					{event: o.event, data: o.data, isThreadEvent: true},
					undefined
				)
			);
		}
	})();
}
