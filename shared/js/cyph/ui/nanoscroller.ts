import {env} from '../env';
import {util} from '../util';
import {elements} from './elements';


/**
 * Handles OS-X-style scrollbars (generally intended for use
 * only when the scrollbar explicitly needs to be auto-hidden).
 */
export class NanoScroller {
	/** Indicates whether NanoScroller is to be used. */
	private static readonly isActive: boolean	= !env.isMobile && !env.isOSX;


	/**
	 * Updates the state of all NanoScroller scrollbars.
	 */
	public update () : void {
		if (NanoScroller.isActive) {
			util.getValue(
				elements.nanoScroller(),
				'nanoScroller',
				() => {}
			).call(elements.nanoScroller());
		}
	}

	constructor () {}
}

/** @see NanoScroller */
export const nanoScroller	= new NanoScroller();
