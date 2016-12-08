import {env} from './env';
import {IThread} from './ithread';


/**
 * Global cross-thread event-manager.
 */
export class EventManager {
	/** @ignore */
	private readonly handlers: {[event: string]: Function[]}			= {};

	/** @ignore */
	private readonly indices: {[event: string]: Map<Function, number>}	= {};

	/** @ignore */
	private readonly untriggeredEvents: string	= 'untriggeredEvents';

	/** List of all active threads. */
	public readonly threads: IThread[]		= [];

	/**
	 * Removes handler from event.
	 * @param event
	 * @param handler
	 */
	public off<T> (event: string, handler?: (data: T) => void) : void {
		if (!this.handlers[event]) {
			return;
		}

		this.handlers[event].splice(this.indices[event].get(handler), 1);
		this.indices[event].delete(handler);

		if (this.handlers[event].length < 1) {
			this.handlers[event]	= null;
			this.indices[event]		= null;
		}
	}

	/**
	 * Attaches handler to event.
	 * @param event
	 * @param handler
	 */
	public on<T> (event: string, handler: (data: T) => void) : void {
		if (!this.handlers[event]) {
			this.handlers[event]	= [];
			this.indices[event]		= new Map<Function, number>();
		}

		if (this.indices[event].has(handler)) {
			return;
		}

		this.indices[event].set(
			handler,
			this.handlers[event].push(handler) - 1
		);
	}

	/**
	 * Returns first occurrence of event.
	 * @param event
	 */
	public async one<T> (event: string) : Promise<T> {
		return new Promise<T>(resolve => {
			let f: (data: T) => void;

			f	= (data: T) => {
				this.off(event, f);
				resolve(data);
			};

			this.on(event, f);
		});
	}

	/**
	 * Triggers event.
	 * @param event
	 * @param data
	 * @param shouldTrigger Ignore this (used internally for cross-thread events).
	 */
	public trigger<T> (
		event: string,
		data?: T,
		shouldTrigger: boolean = env.isMainThread
	) : void {
		if (!shouldTrigger) {
			this.trigger(this.untriggeredEvents, {event, data}, true);
		}
		else {
			for (let handler of (this.handlers[event] || [])) {
				try {
					handler(data);
				}
				catch (err) {
					setTimeout(() => { throw err; }, 0);
				}
			}

			if (env.isMainThread) {
				for (let thread of this.threads) {
					try {
						thread.postMessage({event, data, isThreadEvent: true});
					}
					catch (_) {}
				}
			}
		}
	}

	constructor () {
		if (env.isMainThread) {
			return;
		}

		self.onmessage	= (e: MessageEvent) => {
			const data: any	= e.data || {};

			if (data.isThreadEvent) {
				this.trigger(data.event, data.data, true);
			}
			else if (onthreadmessage) {
				onthreadmessage(e);
			}
		};

		this.on(
			this.untriggeredEvents,
			(o: {event: string; data: any}) => self.postMessage(
				{event: o.event, data: o.data, isThreadEvent: true},
				undefined
			)
		);
	}
}

/** @see EventManager */
export const eventManager	= new EventManager();
