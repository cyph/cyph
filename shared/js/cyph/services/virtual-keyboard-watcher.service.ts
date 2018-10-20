import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {EnvService} from './env.service';


/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
@Injectable()
export class VirtualKeyboardWatcherService extends BaseProvider {
	/** @ignore */
	private readonly initialScreenSize: number	= self.innerHeight;

	/** Indicates whether the virtual keyboard is currently open. */
	public readonly isOpen	= new BehaviorSubject<boolean>(false);

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		if (!this.envService.isMobileOS) {
			return;
		}

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.envService.isCordova) {
			self.addEventListener('keyboardDidHide', () => { this.isOpen.next(false); });
			self.addEventListener('keyboardDidShow', () => { this.isOpen.next(true); });
			return;
		}

		/* https://stackoverflow.com/a/11650231/459881 */

		/* Android */
		if (this.envService.isAndroid) {
			window.addEventListener('resize', () => {
				this.isOpen.next(window.innerHeight < this.initialScreenSize);
			});
		}
		/* iOS/misc. */
		else {
			const inputSelector		= 'input, textarea';
			const focusBlurListen	= (elements: Element[]) => {
				for (const elem of elements) {
					elem.addEventListener('blur', () => { this.isOpen.next(false); });
					elem.addEventListener('focus', () => { this.isOpen.next(true); });
				}
			};

			focusBlurListen(Array.from(document.querySelectorAll(inputSelector)));

			new MutationObserver(mutations => {
				focusBlurListen(
					mutations.
						map(mutationRecord => {
							const elements	= <Element[]>
								Array.from(mutationRecord.addedNodes).
									filter(elem => elem instanceof Element)
							;

							return [
								...elements.filter(elem => elem.matches(inputSelector)),
								...elements.
									map(elem => Array.from(elem.querySelectorAll(inputSelector))).
									reduce((a, b) => [...a, ...b], [])
							];
						}).
						reduce((a, b) => [...a, ...b], [])
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
