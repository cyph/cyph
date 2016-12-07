import {EventManager} from '../eventmanager';
import {Elements} from './elements';


/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
export class VirtualKeyboardWatcher {
	/** @ignore */
	private static readonly initialScreenSize: number	= self.innerHeight;

	/** @ignore */
	private static readonly keyboardChangeEvent: string	= 'keyboardChangeEvent';

	/** Indicates whether the virtual keyboard is currently open. */
	public static isOpen: boolean	= false;

	/** @ignore */
	private static trigger (isOpen: boolean) : void {
		if (VirtualKeyboardWatcher.isOpen === isOpen) {
			return;
		}

		VirtualKeyboardWatcher.isOpen	= isOpen;
		EventManager.trigger(
			VirtualKeyboardWatcher.keyboardChangeEvent,
			VirtualKeyboardWatcher.isOpen
		);
	}

	/**
	 * Sets handler to run when keyboard status changes.
	 * @param handler
	 */
	public static onChange (handler: (data: boolean) => void) : void {
		EventManager.on(VirtualKeyboardWatcher.keyboardChangeEvent, handler);
	}

	/**
	 * Waits for the keyboard status to change once.
	 */
	public static async waitForChange () : Promise<boolean> {
		return EventManager.one<boolean>(VirtualKeyboardWatcher.keyboardChangeEvent);
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	public static readonly _	= (() => {
		/* http://stackoverflow.com/a/11650231/459881 */

		/* Android */
		Elements.window().on('resize', () =>
			VirtualKeyboardWatcher.trigger(
				window.innerHeight < VirtualKeyboardWatcher.initialScreenSize
			)
		);

		/* iOS */
		$('input').on('focus blur', () => {
			Elements.window().scrollTop(10);
			VirtualKeyboardWatcher.trigger(Elements.window().scrollTop() > 0);
			Elements.window().scrollTop(0);
		});
	})();
}
