/// <reference path="icyphertext.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class Cyphertext extends BaseButtonManager implements ICyphertext {
				private showLock: boolean		= false;
				private curtainClass: string	= 'curtain';
				private toastPosition: string	= 'top right';

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
						/* Performance optimisation */
						if (this.messages.length > (this.isMobile ? 5 : 50)) {
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
					session: Session.ISession,
					controller: IController,
					mobileMenu: ISidebar,
					private dialogManager: IDialogManager,
					private isMobile: boolean
				) {
					super(controller, mobileMenu);

					/* Close cyphertext on esc */
					Elements.window.keyup(e => {
						if (e.keyCode === 27) {
							this.hide();
						}
					});



					session.on(Session.Events.cyphertext,
						(o: { cyphertext: string; author: Session.Authors; }) =>
							this.log(o.cyphertext, o.author)
					);
				}
			}
		}
	}
}
