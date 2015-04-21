/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../idialogmanager.ts" />
/// <reference path="../isidebar.ts" />
/// <reference path="../../analytics.ts" />
/// <reference path="../../icontroller.ts" />
/// <reference path="../../strings.ts" />
/// <reference path="../../session/enums.ts" />
/// <reference path="../../../global/base.ts" />
/// <reference path="../../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class Cyphertext extends BaseButtonManager {
				private showLock: boolean		= false;
				private curtainClass: string	= 'curtain';
				private toastPosition: string	= 'top right';

				private dialogManager: IDialogManager;

				public messages: {author: Session.Authors; text: string;}[]	= [];

				public hide () : void {
					if ($('.' + this.curtainClass).length > 0) {
						Elements.everything.removeClass(this.curtainClass);

						setTimeout(() => {
							this.dialogManager.toast({
								content: Strings.cypherToast3,
								position: this.toastPosition,
								delay: 1000
							});

							/* Workaround for Angular Material bug */
							setTimeout(() => {
								$('md-toast:visible').remove();
								this.showLock	= false;
							}, 2000);
						}, 2000);
					}
				}

				public log (text: string, author: Session.Authors) : void {
					if (text) {
						/* Mobile performance optimisation */
						if (Env.isMobile && this.messages.length > 5) {
							this.messages.shift();
						}

						this.messages.push({author, text});
						this.controller.update();
					}
				}

				public show () : void {
					this.baseButtonClick(() => {
						if (!this.showLock) {
							this.showLock	= true;

							this.dialogManager.toast({
								content: Strings.cypherToast1,
								position: this.toastPosition,
								delay: 2000
							}, () => {
								this.dialogManager.toast({
									content: Strings.cypherToast2,
									position: this.toastPosition,
									delay: 3000
								}, () => {
									Elements.everything.addClass(this.curtainClass);

									Analytics.main.send({
										hitType: 'event',
										eventCategory: 'cyphertext',
										eventAction: 'show',
										eventValue: 1
									});
								});
							});
						}
					});
				}

				public constructor (
					controller: IController,
					mobileMenu: ISidebar,
					dialogManager: IDialogManager
				) {
					super(controller, mobileMenu);

					this.dialogManager	= dialogManager;

					/* Close cyphertext on esc */
					Elements.document.keyup(e => {
						if (e.keyCode === 27) {
							this.hide();
						}
					});
				}
			}
		}
	}
}
