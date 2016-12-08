import {env} from '../env';
import {eventManager} from '../eventmanager';
import {elements} from './elements';


/**
 * Keeps track of this window's visibility to user.
 */
export class VisibilityWatcher {
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
			document.addEventListener('visibilitychange', () =>
				this.trigger(!document.hidden)
			);
		}
		else {
			elements.window().
				focus(() => this.trigger(true)).
				blur(() => this.trigger(false))
			;
		}
	}
}

/** @see VisibilityWatcher */
export const visibilityWatcher	= new VisibilityWatcher();
