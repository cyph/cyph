import {getOrSetDefault} from './util/get-or-set-default';


/**
 * Global event manager.
 */
export class EventManager {
	/** @ignore */
	private readonly eventMappings: Map<string, Set<Function>>	= new Map<string, Set<Function>>();

	/** Removes handler from event. */
	public off<T> (event: string, handler?: (data: T) => void) : void {
		const eventMapping	= this.eventMappings.get(event);

		if (eventMapping === undefined) {
			return;
		}

		if (handler) {
			eventMapping.delete(handler);
		}

		if (!handler || eventMapping.size < 1) {
			this.eventMappings.delete(event);
		}
	}

	/** Attaches handler to event. */
	public on<T> (event: string, handler: (data: T) => void) : void {
		getOrSetDefault(
			this.eventMappings,
			event,
			() => new Set<Function>()
		).add(
			handler
		);
	}

	/** Resolves on first occurrence of event. */
	public async one<T> (event: string) : Promise<T> {
		return new Promise<T>(resolve => {
			const f	= (data: T) => {
				this.off(event, f);
				resolve(data);
			};

			this.on(event, f);
		});
	}

	/** Triggers event. */
	public async trigger<T> (
		event: string,
		data?: T
	) : Promise<void> {
		const eventMapping	= this.eventMappings.get(event);

		if (eventMapping === undefined) {
			return;
		}

		await Promise.all(Array.from(eventMapping).map(async handler => {
			try {
				await handler(data);
			}
			catch (err) {
				/* tslint:disable-next-line:ban */
				setTimeout(() => { throw err; }, 0);
			}
		}));
	}

	constructor () {}
}

/** @see EventManager */
export const eventManager	= new EventManager();
