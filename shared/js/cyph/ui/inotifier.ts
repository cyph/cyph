/**
 * Manages user-facing notifications.
 */
export interface INotifier {
	/**
	 * If user isn't currently viewing this window, sends notification.
	 * @param message
	 */
	notify (message: string) : void;
}
