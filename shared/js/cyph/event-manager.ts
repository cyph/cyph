import {BehaviorSubject} from 'rxjs';
import {take} from 'rxjs/operators';
import {filterUndefinedOperator} from './util/filter';
import {getOrSetDefault} from './util/get-or-set-default';

/**
 * Event manager.
 */
export class EventManager {
	/** @ignore */
	private readonly eventMappings = new Map<
		string,
		BehaviorSubject<Set<(data: any) => void> | undefined>
	>();

	/** @ignore */
	private getEventMapping (
		event: string
	) : BehaviorSubject<Set<(data: any) => void> | undefined> {
		return getOrSetDefault(
			this.eventMappings,
			event,
			() =>
				new BehaviorSubject<Set<(data: any) => void> | undefined>(
					undefined
				)
		);
	}

	/** Removes handler from event. */
	public off<T> (event: string, handler?: (data: T) => void) : void {
		const eventMapping = this.getEventMapping(event);

		if (eventMapping.value === undefined) {
			return;
		}

		if (handler) {
			eventMapping.value.delete(handler);
		}

		if (!handler || eventMapping.value.size < 1) {
			this.eventMappings.delete(event);
		}
	}

	/** Attaches handler to event. */
	public on<T> (event: string, handler: (data: T) => void) : void {
		const eventMapping = this.getEventMapping(event);

		if (eventMapping.value) {
			eventMapping.value.add(handler);
		}
		else {
			eventMapping.next(new Set([handler]));
		}
	}

	/** Resolves on first occurrence of event. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	public async one<T = void> (event: string) : Promise<T> {
		return new Promise<T>(resolve => {
			const f = (data: T) => {
				this.off(event, f);
				resolve(data);
			};

			this.on(event, f);
		});
	}

	/**
	 * Triggers event.
	 * If no event handlers are yet set, wait for one.
	 * Resolve after all handlers have been run, throwing error if any one fails.
	 */
	public async trigger<T> (event: string, data?: T) : Promise<void> {
		const eventMapping = this.getEventMapping(event);

		const handlers =
			eventMapping.value ||
			(await eventMapping
				.pipe(filterUndefinedOperator(), take(1))
				.toPromise());

		await Promise.all(
			Array.from(handlers).map(async handler => handler(data))
		);
	}

	constructor () {}
}
