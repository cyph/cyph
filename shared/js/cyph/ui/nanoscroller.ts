import {Env} from '../env';
import {Util} from '../util';
import {Elements} from './elements';


/**
 * Handles OS-X-style scrollbars (generally intended for use
 * only when the scrollbar explicitly needs to be auto-hidden).
 */
export class NanoScroller {
	/** Indicates whether NanoScroller is to be used. */
	public static isActive: boolean	= !Env.isMobile && !Env.isOSX;

	/**
	 * Updates the state of all NanoScroller scrollbars.
	 */
	public static update () : void {
		if (NanoScroller.isActive) {
			Util.getValue(
				Elements.nanoScroller(),
				'nanoScroller',
				() => {}
			).call(Elements.nanoScroller());
		}
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	private static _	= (() => {
		$(NanoScroller.update);
	})();
}
