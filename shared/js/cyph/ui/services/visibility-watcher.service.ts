import {Injectable} from '@angular/core';
import {env} from '../../env';
import {eventManager} from '../../event-manager';


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

	/**
	 * Sets handler to run when visibility changes.
	 * @param handler
	 */
	public onChange (handler: (data: boolean) => void) : void {
		eventManager.on(this.visibilityChangeEvent, handler);
	}

	/**
	 * Waits for the visibility to change once.
	 */
	public async waitForChange () : Promise<boolean> {
		return eventManager.one<boolean>(this.visibilityChangeEvent);
	}

	constructor () {
		if (env.isMobile) {
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
