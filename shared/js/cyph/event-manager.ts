import {ReplaySubject, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {ISessionMessageData} from './session/isession-message-data';
import {getOrSetDefault} from './util/get-or-set-default';

/**
 * Event manager.
 */
export class EventManager {
	/** @ignore */
	private readonly subjects = new Map<
		string,
		ReplaySubject<ISessionMessageData[]>
	>();

	/** @ignore */
	private readonly subscriptions = new Map<
		string,
		Map<(data: ISessionMessageData[]) => void, Subscription>
	>();

	/** @ignore */
	private getSubject (event: string) : ReplaySubject<ISessionMessageData[]> {
		return getOrSetDefault(
			this.subjects,
			event,
			() => new ReplaySubject<ISessionMessageData[]>()
		);
	}

	/** @ignore */
	private getSubscriptions (
		event: string
	) : Map<(data: ISessionMessageData[]) => void, Subscription> {
		return getOrSetDefault(
			this.subscriptions,
			event,
			() => new Map<(data: ISessionMessageData[]) => void, Subscription>()
		);
	}

	/** Removes handler from event. */
	public off (
		event: string,
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
		event: string,
		handler: (data: ISessionMessageData[]) => void
	) : void {
		this.getSubscriptions(event).set(
			handler,
			this.getSubject(event).subscribe(handler)
		);
	}

	/** Resolves on first occurrence of event. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	public async one (event: string) : Promise<ISessionMessageData[]> {
		return this.getSubject(event)
			.pipe(take(1))
			.toPromise();
	}

	/** Triggers event. */
	public trigger (event: string, data: ISessionMessageData[]) : void {
		this.getSubject(event).next(data);
	}

	constructor () {}
}
