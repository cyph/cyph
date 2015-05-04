module Cyph {
	export module UI {
		/**
		 * Manages user-facing notifications.
		 * @interface
		 */
		export interface INotifier {
			/**
			 * If user isn't currently viewing this window, sends notification.
			 * @param message
			 */
			notify (message: string) : void;
		}
	}
}
