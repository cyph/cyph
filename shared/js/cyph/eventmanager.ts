import {env} from './env';
import {IThread} from './ithread';


/**
 * Global cross-thread event-manager.
 */
export class EventManager {
	/** @ignore */
	private readonly eventMappings: Map<string, {
		handlers: Function[];
		indices: Map<Function, number>;
	}>	= new Map<string, {
		handlers: Function[];
		indices: Map<Function, number>;
	}>();

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
		if (!this.eventMappings.has(event)) {
			return;
		}

		const eventMapping	= this.eventMappings.get(event);

		if (!handler || eventMapping.handlers.length < 1) {
			this.eventMappings.delete(event);
		}
		else if (eventMapping.indices.has(handler)) {
			const index	= eventMapping.indices.get(handler);
			eventMapping.handlers.splice(index, 1);
			eventMapping.indices.delete(handler);
		}
	}

	/**
	 * Attaches handler to event.
	 * @param event
	 * @param handler
	 */
	public on<T> (event: string, handler: (data: T) => void) : void {
		if (!this.eventMappings.has(event)) {
			this.eventMappings.set(event, {
				handlers: [],
				indices: new Map<Function, number>()
			});
		}

		const eventMapping	= this.eventMappings.get(event);

		if (eventMapping.indices.has(handler)) {
			return;
		}

		eventMapping.indices.set(
			handler,
			eventMapping.handlers.push(handler) - 1
		);
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

		const handlers	= this.eventMappings.get(event).handlers.slice(0);

		for (let handler of handlers) {
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
