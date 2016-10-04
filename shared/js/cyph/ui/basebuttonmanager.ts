import {ISidebar} from './isidebar';
import {IController} from '../icontroller';
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
			try {
				await Util.sleep(250);
				this.mobileMenu().close();

				if (callback) {
					callback();
				}
			}
			finally {
				this.controller.update();
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
	 * @param controller
	 * @param mobileMenu
	 */
	public constructor (
		protected controller: IController,
		protected mobileMenu: () => ISidebar = () => ({close: () => {}, open: () => {}})
	) {}
}
