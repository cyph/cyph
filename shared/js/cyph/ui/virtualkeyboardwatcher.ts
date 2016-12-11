import {eventManager} from '../eventmanager';
import {elements} from './elements';


/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
export class VirtualKeyboardWatcher {
	/** @ignore */
	private readonly initialScreenSize: number	= self.innerHeight;

	/** @ignore */
	private readonly keyboardChangeEvent: string	= 'keyboardChangeEvent';

	/** Indicates whether the virtual keyboard is currently open. */
	public isOpen: boolean	= false;

	/** @ignore */
	private trigger (isOpen: boolean) : void {
		if (this.isOpen === isOpen) {
			return;
		}

		this.isOpen	= isOpen;
		eventManager.trigger(
			this.keyboardChangeEvent,
			this.isOpen
		);
	}

	/**
	 * Sets handler to run when keyboard status changes.
	 * @param handler
	 */
	public onChange (handler: (data: boolean) => void) : void {
		eventManager.on(this.keyboardChangeEvent, handler);
	}

	/**
	 * Waits for the keyboard status to change once.
	 */
	public async waitForChange () : Promise<boolean> {
		return eventManager.one<boolean>(this.keyboardChangeEvent);
	}

	constructor () {
		/* http://stackoverflow.com/a/11650231/459881 */

		/* Android */
		elements.window().resize(() =>
			this.trigger(
				window.innerHeight < this.initialScreenSize
			)
		);

		/* iOS */
		const inputSelector		= 'input, textarea';
		const focusBlurListen	= ($elem: JQuery) =>
			$elem.on('focus blur', () => {
				elements.window().scrollTop(10);
				this.trigger(elements.window().scrollTop() > 0);
				elements.window().scrollTop(0);
			})
		;
		focusBlurListen($(inputSelector));
		new MutationObserver(mutations => {
			focusBlurListen(
				$(mutations.
					map(mutationRecord => Array.from(mutationRecord.addedNodes)).
					reduce((a, b) => a.concat(b), [])
				).
					find(inputSelector).
					addBack().
					filter(inputSelector)
			);
		}).observe(elements.body()[0], {
			attributes: false,
			characterData: false,
			childList: true,
			subtree: true
		});
	}
}

/** @see VirtualKeyboardWatcher */
export const virtualKeyboardWatcher	= new VirtualKeyboardWatcher();
