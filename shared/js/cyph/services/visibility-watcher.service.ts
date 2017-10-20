import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {eventManager} from '../event-manager';
import {EnvService} from './env.service';


/**
 * Keeps track of this window's visibility to user.
 */
@Injectable()
export class VisibilityWatcherService {
	/** @ignore */
	private readonly visibilityChangeEvent: string	= 'visibilityChangeEvent';

	/** Indicates whether the window is currently visible. */
	public isVisible: boolean	= true;

	/** @ignore */
	private trigger (isVisible: boolean) : void {
		if (this.isVisible === isVisible) {
			return;
		}

		this.isVisible	= isVisible;
		eventManager.trigger(this.visibilityChangeEvent, this.isVisible);
	}

	/** Sets handler to run when visibility changes. */
	public onChange (handler: (isVisible: boolean) => void) : void {
		eventManager.on(this.visibilityChangeEvent, handler);
	}

	/**
	 * Waits for the visibility to change once.
	 */
	public async waitForChange () : Promise<boolean> {
		return eventManager.one<boolean>(this.visibilityChangeEvent);
	}

	/**
	 * Waits until the window is visible.
	 */
	public async waitUntilVisible () : Promise<void> {
		if (this.isVisible) {
			return;
		}

		await this.waitForChange();
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.envService.isMobile) {
			document.addEventListener('visibilitychange', () => {
				this.trigger(!document.hidden);
			});
		}
		else {
			$(window).
				focus(() => { this.trigger(true); }).
				blur(() => { this.trigger(false); })
			;
		}
	}
}
