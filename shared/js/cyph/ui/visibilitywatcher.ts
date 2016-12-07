import {Env} from '../env';
import {EventManager} from '../eventmanager';
import {Elements} from './elements';


/**
 * Keeps track of this window's visibility to user.
 */
export class VisibilityWatcher {
	/** @ignore */
	private static readonly visibilityChangeEvent: string	= 'visibilityChangeEvent';

	/** Indicates whether the window is currently visible. */
	public static isVisible: boolean	= true;

	/** @ignore */
	private static trigger (isVisible: boolean) : void {
		if (VisibilityWatcher.isVisible === isVisible) {
			return;
		}

		VisibilityWatcher.isVisible	= isVisible;
		EventManager.trigger(VisibilityWatcher.visibilityChangeEvent, VisibilityWatcher.isVisible);
	}

	/**
	 * Sets handler to run when visibility changes.
	 * @param handler
	 */
	public static onChange (handler: (data: boolean) => void) : void {
		EventManager.on(VisibilityWatcher.visibilityChangeEvent, handler);
	}

	/**
	 * Waits for the visibility to change once.
	 */
	public static async waitForChange () : Promise<boolean> {
		return EventManager.one<boolean>(VisibilityWatcher.visibilityChangeEvent);
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	public static readonly _	= (() => {
		if (Env.isMobile) {
			document.addEventListener('visibilitychange', () =>
				VisibilityWatcher.trigger(!document.hidden)
			);
		}
		else {
			Elements.window().
				focus(() => VisibilityWatcher.trigger(true)).
				blur(() => VisibilityWatcher.trigger(false))
			;
		}
	})();
}
