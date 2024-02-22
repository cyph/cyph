import {Injectable} from '@angular/core';
import $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {EnvService} from './env.service';

/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
@Injectable()
export class VirtualKeyboardWatcherService extends BaseProvider {
	/** @ignore */
	private readonly initialScreenSize: number = self.innerHeight;

	/** Indicates whether the virtual keyboard is currently open. */
	public readonly isOpen = new BehaviorSubject<boolean>(false);

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

		if (this.envService.isCordovaMobile) {
			self.addEventListener('keyboardDidHide', () => {
				this.isOpen.next(false);
			});
			self.addEventListener('keyboardDidShow', () => {
				this.isOpen.next(true);
			});
		}

		/* https://stackoverflow.com/a/11650231/459881 */

		const $window = $(window);

		/* Android */
		if (this.envService.isAndroid) {
			$window.on('resize', () => {
				this.isOpen.next(window.innerHeight < this.initialScreenSize);
			});
		}
		/* iOS/misc. */
		else {
			const inputSelector = 'input, textarea';
			const focusBlurListen = ($elem: JQuery) => {
				$elem.on('blur', () => {
					this.isOpen.next(false);
				});
				$elem.on('focus', () => {
					this.isOpen.next(true);
				});
			};

			focusBlurListen($(inputSelector));
			new MutationObserver(mutations => {
				focusBlurListen(
					$(
						mutations.flatMap(
							mutationRecord =>
								<HTMLElement[]> (
									Array.from(mutationRecord.addedNodes)
								)
						)
					)
						.find(inputSelector)
						.addBack()
						.filter(inputSelector)
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
