import {env} from './env';
import {IThread} from './ithread';
import {MaybePromise} from './maybe-promise-type';
import {getOrSetDefault} from './util/get-or-set-default';
import {uuid} from './util/uuid';


/**
 * Global cross-thread event-manager.
 */
export class EventManager {
	/** @ignore */
	private readonly eventMappings: Map<string, Set<Function>>	= new Map<string, Set<Function>>();

	/** List of all active threads. */
	public readonly threads: Set<IThread>	= new Set<IThread>();

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

	/** EventManager.on wrapper that allows sending a response to EventManager.rpcTrigger. */
	public rpcOn<I, O> (
		event: string,
		handler: (data: I) => MaybePromise<O>,
		postHandler?: (input: I, output: O) => void
	) : void {
		this.on(event, async (o: {data: I; eventID: string}) => {
			let output: O;

			try {
				output	= await handler(o.data);
				this.trigger(o.eventID, {data: output}, true);
			}
			catch (err) {
				this.trigger(o.eventID, {error: {message: err && err.message || ''}}, true);
				return;
			}

			if (postHandler) {
				postHandler(o.data, output);
			}
		});
	}

	/**
	 * EventManager.trigger wrapper that allows receiving a response from EventManager.on.
	 * @param init Optional promise to wait on for initialization of handler before triggering.
	 */
	public async rpcTrigger<O, I = any> (event: string, data?: I, init?: Promise<void>) : Promise<O> {
		const eventID			= uuid();
		const responsePromise	=
			this.one<{data: O; error: undefined}|{data: never; error: {message: string}}>(
				eventID
			)
		;

		await init;
		this.trigger(event, {data, eventID}, true);

		const response	= await responsePromise;

		if (response.error !== undefined) {
			throw new Error(`RPC trigger to ${event} failed.\n\n${response.error.message}`);
		}
		else {
			return response.data;
		}
	}

	/**
	 * Triggers event.
	 * @param crossThread Indicates whether event should be propagated to other threads.
	 */
	public trigger<T> (event: string, data?: T, crossThread: boolean = false) : void {
		if (crossThread) {
			if (env.isMainThread) {
				for (const thread of Array.from(this.threads)) {
					try {
						thread.postMessage({data, event, isThreadEvent: true});
					}
					catch {}
				}
			}
			else {
				/* DedicatedWorkerGlobalScope.postMessage(), not Window.postMessage() */
				(<any> self).postMessage({data, event, isThreadEvent: true});
			}
		}

		const eventMapping	= this.eventMappings.get(event);

		if (eventMapping === undefined) {
			return;
		}

		for (const handler of Array.from(eventMapping)) {
			try {
				handler(data);
			}
			catch (err) {
				/* tslint:disable-next-line:ban */
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
				this.trigger(data.event, data.data);
			}
			else if (onthreadmessage) {
				onthreadmessage(e);
			}
		};
	}
}

/** @see EventManager */
export const eventManager	= new EventManager();
