module Cyph {
	/**
	 * Global cross-thread event-manager.
	 */
	export class EventManager {
		private static handlers: {[event: string] : Function[]}	= {};
		private static untriggeredEvents: string	= 'untriggeredEvents';

		/** Ignore this (used by EventManager and Thread for cross-thread event stuff). */
		public static mainThreadEvents: string	= 'mainThreadEvents';

		/**
		 * Removes handler from event.
		 * @param event
		 * @param handler
		 */
		public static off (event: string, handler: Function) : void {
			EventManager.handlers[event]	=
				(EventManager.handlers[event] || []).filter(f => f !== handler)
			;
		}

		/**
		 * Attaches handler to event.
		 * @param event
		 * @param handler
		 */
		public static on (event: string, handler: Function) : void {
			EventManager.handlers[event]	= EventManager.handlers[event] || [];
			EventManager.handlers[event].push(handler);
		}

		/**
		 * Triggers event.
		 * @param event
		 * @param data Note: If this contains a callback function, the event will not cross
		 * threads. (Adding this functionality would be trivial; it just hasn't been needed.)
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
				for (const handler of (EventManager.handlers[event] || [])) {
					try {
						handler(data);
					}
					catch (err) {
						setTimeout(() => { throw err }, 0);
					}
				}

				if (Env.isMainThread) {
					for (const thread of Thread.threads) {
						try {
							thread.postMessage({event, data, isThreadEvent: true});
						}
						catch (_) {}
					}
				}
			}
		}

		private static _	= (() => {
			if (Env.isMainThread) {
				EventManager.on(
					EventManager.mainThreadEvents,
					(o: { method: string; args: any[]; }) =>
						Thread.callMainThread(o.method, o.args)
				);
			}
			else {
				self.onmessage	= (e: MessageEvent) => {
					if (Util.getValue(e.data, 'isThreadEvent')) {
						EventManager.trigger(e.data.event, e.data.data, true);
					}
					else if (onthreadmessage) {
						onthreadmessage(e);
					}
				};

				EventManager.on(
					EventManager.untriggeredEvents,
					(o: { event: string; data: any; }) =>
						postMessage({event: o.event, data: o.data, isThreadEvent: true}, undefined)
				);
			}
		})();
	}
}
