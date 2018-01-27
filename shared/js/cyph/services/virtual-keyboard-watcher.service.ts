import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {eventManager} from '../event-manager';
import {EnvService} from './env.service';


/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
@Injectable()
export class VirtualKeyboardWatcherService {
	/** @ignore */
	private readonly initialScreenSize: number		= self.innerHeight;

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

	/** Sets handler to run when keyboard status changes. */
	public onChange (handler: (isOpen: boolean) => void) : void {
		eventManager.on(this.keyboardChangeEvent, handler);
	}

	/**
	 * Waits for the keyboard status to change once.
	 */
	public async waitForChange () : Promise<boolean> {
		return eventManager.one<boolean>(this.keyboardChangeEvent);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (!this.envService.isMobile) {
			return;
		}

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* http://stackoverflow.com/a/11650231/459881 */

		const $window	= $(window);

		/* Android */
		if (this.envService.isAndroid) {
			$window.on('resize', () => {
				this.trigger(window.innerHeight < this.initialScreenSize);
			});
		}
		/* iOS/misc. */
		else {
			const inputSelector		= 'input, textarea';
			const focusBlurListen	= ($elem: JQuery) => {
				$elem.on('blur', () => { this.trigger(false); });
				$elem.on('focus', () => { this.trigger(true); });
			};

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
			}).observe(document.body, {
				attributes: false,
				characterData: false,
				childList: true,
				subtree: true
			});
		}
	}
}
