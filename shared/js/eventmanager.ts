/// <reference path="globals.ts" />


class EventManager {
	private static handlers: {[event: string] : Function[]}	= {};

	public static allEvents: string	= 'allEvents';

	public static off (event: string, f: Function) : void {
		let handlers: Function[]	= EventManager.handlers[event];

		for (let i = 0 ; handlers && i < handlers.length ; ++i) {
			if (handlers[i] == f) {
				delete handlers[i];
			}
		}
	}

	public static on (event: string, f: Function) : void {
		EventManager.handlers[event]	= EventManager.handlers[event] || [];
		EventManager.handlers[event].push(f);
	}

	public static trigger (event: string, data?: any) : void {
		let handlers: Function[]	= EventManager.handlers[event];

		for (let i = 0 ; handlers && i < handlers.length ; ++i) {
			handlers[i](data);
		}

		if (event != EventManager.allEvents) {
			EventManager.trigger(EventManager.allEvents, {event, data});
		}
	}
}
