import {ISidebar} from 'isidebar';
import {IController} from 'cyph/icontroller';


/**
 * Base class for components that handle buttons.
 */
export class BaseButtonManager {
	protected static buttonLock: boolean;


	/**
	 * Base logic shared by every button click (e.g. close sidenav).
	 */
	public baseButtonClick (callback?: Function) : void {
		if (!BaseButtonManager.buttonLock) {
			BaseButtonManager.buttonLock	= true;

			setTimeout(() => {
				try {
					this.mobileMenu.close();

					if (callback) {
						callback();
					}
				}
				finally {
					BaseButtonManager.buttonLock	= false;
					this.controller.update();
				}
			}, 250);
		}
	}

	/**
	 * Opens mobile sidenav menu.
	 */
	public openMobileMenu () : void {
		setTimeout(() => this.mobileMenu.open(), 250);
	}

	/**
	 * @param controller
	 * @param mobileMenu
	 */
	public constructor (
		protected controller: IController,
		protected mobileMenu: ISidebar
	) {}
}
