/**
 * Manages user-facing notifications.
 */
export interface INotificationService {
	/** If user isn't currently viewing this window, sends notification. */
	notify (message: string) : void;
}
