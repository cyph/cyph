import {ReplaySubject, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {getOrSetDefault} from '../util/get-or-set-default';
import {RpcEvents} from './enums';
import {ISessionMessageData} from './isession-message-data';

/**
 * Event manager.
 */
export class EventManager {
	/** @ignore */
	private readonly subjects = new Map<
		RpcEvents,
		ReplaySubject<ISessionMessageData[]>
	>();

	/** @ignore */
	private readonly subscriptions = new Map<
		RpcEvents,
		Map<(data: ISessionMessageData[]) => void, Subscription>
	>();

	/** @ignore */
	private getSubject (
		event: RpcEvents
	) : ReplaySubject<ISessionMessageData[]> {
		return getOrSetDefault(
			this.subjects,
			event,
			() => new ReplaySubject<ISessionMessageData[]>()
		);
	}

	/** @ignore */
	private getSubscriptions (
		event: RpcEvents
	) : Map<(data: ISessionMessageData[]) => void, Subscription> {
		return getOrSetDefault(
			this.subscriptions,
			event,
			() => new Map<(data: ISessionMessageData[]) => void, Subscription>()
		);
	}

	/** Clears out all subscriptions. */
	public clear () : void {
		for (const sub of Array.from(this.subscriptions.values()).flatMap(m =>
			Array.from(m.values())
		)) {
			sub.unsubscribe();
		}

		this.subjects.clear();
		this.subscriptions.clear();
	}

	/** Removes handler from event. */
	public off (
		event: RpcEvents,
		handler?: (data: ISessionMessageData[]) => void
	) : void {
		const subscriptions = this.getSubscriptions(event);

		for (const f of handler ?
			[handler] :
			Array.from(subscriptions.keys())) {
			/* eslint-disable-next-line no-unused-expressions */
			subscriptions.get(f)?.unsubscribe();
			subscriptions.delete(f);
		}
	}

	/** Attaches handler to event. */
	public on (
		event: RpcEvents,
		handler: (data: ISessionMessageData[]) => void
	) : void {
		this.getSubscriptions(event).set(
			handler,
			this.getSubject(event).subscribe(handler)
		);
	}

	/** Resolves on first occurrence of event. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	public async one (event: RpcEvents) : Promise<ISessionMessageData[]> {
		return this.getSubject(event)
			.pipe(take(1))
			.toPromise();
	}

	/** Triggers event. */
	public trigger (event: RpcEvents, data: ISessionMessageData[]) : void {
		this.getSubject(event).next(data);
	}

	constructor () {}
}
