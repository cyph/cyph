import {ISidebar} from './isidebar';
import {Util} from '../util';


/**
 * Base class for components that handle buttons.
 */
export class BaseButtonManager {
	protected static buttonLock: {}	= {};


	/**
	 * Base logic shared by every button click (e.g. close sidenav).
	 */
	public async baseButtonClick (callback: Function) : Promise<void> {
		return Util.lock(BaseButtonManager.buttonLock, async () => {
			await Util.sleep(250);
			this.mobileMenu().close();

			if (callback) {
				callback();
			}
		}, undefined, true);
	}

	/**
	 * Opens mobile sidenav menu.
	 */
	public async openMobileMenu () : Promise<void> {
		await Util.sleep(250);
		this.mobileMenu().open();
	}

	/**
	 * @param mobileMenu
	 */
	public constructor (
		protected mobileMenu: () => ISidebar = () => ({close: () => {}, open: () => {}})
	) {}
}
