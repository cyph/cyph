import {util} from '../util';
import {ISidebar} from './isidebar';


/**
 * Base class for components that handle buttons.
 */
export class BaseButtonManager {
	/** @ignore */
	protected static buttonLock: {}	= {};


	/**
	 * Base logic shared by every button click (e.g. close sidenav).
	 */
	public async baseButtonClick (callback: Function) : Promise<void> {
		return util.lock(
			BaseButtonManager.buttonLock,
			async () => {
				await util.sleep();
				this.mobileMenu().close();

				if (callback) {
					callback();
				}
			},
			undefined,
			true
		);
	}

	/**
	 * Opens mobile sidenav menu.
	 */
	public async openMobileMenu () : Promise<void> {
		await util.sleep();
		this.mobileMenu().open();
	}

	constructor (
		/** @ignore */
		protected mobileMenu: () => ISidebar = () => ({close: () => {}, open: () => {}})
	) {}
}
