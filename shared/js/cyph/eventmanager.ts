import {env} from './env';
import {IThread} from './ithread';


/**
 * Global cross-thread event-manager.
 */
export class EventManager {
	/** @ignore */
	private readonly eventMappings: Map<string, Set<Function>>	= new Map<string, Set<Function>>();

	/** @ignore */
	private readonly untriggeredEvents: string	= 'untriggeredEvents';

	/** List of all active threads. */
	public readonly threads: Set<IThread>		= new Set<IThread>();

	/**
	 * Removes handler from event.
	 * @param event
	 * @param handler
	 */
	public off<T> (event: string, handler?: (data: T) => void) : void {
		if (!this.eventMappings.has(event)) {
			return;
		}

		const eventMapping	= this.eventMappings.get(event);

		eventMapping.delete(handler);

		if (!handler || eventMapping.size < 1) {
			this.eventMappings.delete(event);
		}
	}

	/**
	 * Attaches handler to event.
	 * @param event
	 * @param handler
	 */
	public on<T> (event: string, handler: (data: T) => void) : void {
		if (!this.eventMappings.has(event)) {
			this.eventMappings.set(event, new Set<Function>());
		}

		this.eventMappings.get(event).add(handler);
	}

	/**
	 * Resolves on first occurrence of event.
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
			return;
		}

		if (env.isMainThread) {
			for (let thread of this.threads) {
				try {
					thread.postMessage({event, data, isThreadEvent: true});
				}
				catch (_) {}
			}
		}

		if (!this.eventMappings.has(event)) {
			return;
		}

		for (let handler of Array.from(this.eventMappings.get(event))) {
			try {
				handler(data);
			}
			catch (err) {
				setTimeout(() => { throw err; }, 0);
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
