module Cyph {
	export module UI {
		export class BaseButtonManager {
			protected static buttonLock: boolean;


			protected baseButtonClick (callback: Function) : void {
				if (!BaseButtonManager.buttonLock) {
					BaseButtonManager.buttonLock	= true;

					setTimeout(() => {
						try {
							this.mobileMenu.close();
							callback();
						}
						finally {
							BaseButtonManager.buttonLock	= false;
							this.controller.update();
						}
					}, 250);
				}
			}

			public constructor (
				protected controller: IController,
				protected mobileMenu: ISidebar
			) {}
		}
	}
}
