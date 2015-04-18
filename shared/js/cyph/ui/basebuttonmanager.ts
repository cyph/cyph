/// <reference path="isidebar.ts" />
/// <reference path="../icontroller.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export class BaseButtonManager {
			protected static buttonLock: boolean;


			protected controller: IController;
			protected mobileMenu: ISidebar;

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

			public constructor (controller: IController, mobileMenu: ISidebar) {
				this.controller	= controller;
				this.mobileMenu	= mobileMenu;
			}
		}
	}
}
