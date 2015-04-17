/// <reference path="enums.ts" />
/// <reference path="../../cyph/icontroller.ts" />
/// <reference path="../../cyph/ui/elements.ts" />
/// <reference path="../../cyph/ui/idialogmanager.ts" />
/// <reference path="../../cyph/ui/inotifier.ts" />
/// <reference path="../../cyph/ui/isidebar.ts" />
/// <reference path="../../cyph/ui/isignupform.ts" />
/// <reference path="../../cyph/ui/chat/ichat.ts" />
/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph.im {
	export module UI {
		export class UI {
			private controller: Cyph.IController;
			private dialogManager: Cyph.UI.IDialogManager;
			private mobileMenu: Cyph.UI.ISidebar;
			private notifier: Cyph.UI.INotifier;

			public copyUrl: string			= '';
			public copyUrlEncoded: string	= '';
			public state: States			= States.none;

			public chat: Cyph.UI.Chat.IChat;
			public signupForm: Cyph.UI.ISignupForm;

			public beginWaiting () : void {
				this.changeState(States.waitingForFriend);

				let copyUrl: string	=
					((!Cyph.Env.isOnion && location['origin']) || 'https://www.cyph.im') +
					'/#' +
					this.chat.session.cyphId +
					this.chat.session.sharedSecret
				;

				this.copyUrlEncoded	= encodeURIComponent(copyUrl);


				let setCopyUrl: Function	= () => {
					if (this.copyUrl !== copyUrl) {
						this.copyUrl	= copyUrl;
						this.controller.update();
					}
				};

				let selectCopyUrl: Function	= () =>
					Cyph.Util.getValue<Function>(
						Cyph.UI.Elements.copyUrlInput[0],
						'setSelectionRange',
						() => {}
					)(0, copyUrl.length)
				;

				if (Cyph.Env.isMobile) {
					setCopyUrl();

					/* Only allow right-clicking (for copying the link) */
					Cyph.UI.Elements.copyUrlLink.click(e =>
						e.preventDefault()
					);
				}
				else {
					let copyUrlInterval: number	= setInterval(() => {
						if (this.state === States.waitingForFriend) {
							setCopyUrl();
							Cyph.UI.Elements.copyUrlInput.focus();
							selectCopyUrl();
						}
						else {
							clearInterval(copyUrlInterval);
						}
					}, 250);
				}

				if (Cyph.Env.isIE) {
					let expireTime: string	= new Date(Date.now() + 600000)
						.toLocaleTimeString()
						.toLowerCase()
						.replace(/(.*:.*):.*? /, '$1')
					;

					Cyph.UI.Elements.timer.parent().text('Link expires at ' + expireTime);
					Cyph.UI.Elements.timer	= null;
				}
				else {
					Cyph.UI.Elements.timer[0]['start']();
				}
			}

			public changeState (state: States) : void {
				this.state	= state;
				this.controller.update();
			}

			public openMobileMenu () : void {
				setTimeout(() => {
					this.mobileMenu.open();
				}, 250);
			}

			public constructor (
				controller: Cyph.IController,
				dialogManager: Cyph.UI.IDialogManager,
				mobileMenu: Cyph.UI.ISidebar,
				notifier: Cyph.UI.INotifier
			) {
				this.controller		= controller;
				this.dialogManager	= dialogManager;
				this.mobileMenu		= mobileMenu;
				this.notifier		= notifier;

				if (
					WebSign &&
					WebSign.detectChange() &&
					!Cyph.Config.validWebSignHashes[localStorage.webSignBootHash]
				) {
					this.changeState(States.webSignObsolete);
					Errors.logWebSign();
				}
				else {
					processUrlState	= () : void => {
						let urlState: string	= Cyph.Util.getUrlState();

						if (urlState === '404') {
							this.changeState(States.error);
						}
						else {
							Cyph.Util.pushNotFound();
							return;
						}

						history.replaceState({}, '', '/' + urlState);
					};

					this.chat		= new Cyph.UI.Chat.Chat(
						this.controller,
						this.dialogManager,
						this.mobileMenu,
						this.notifier
					);

					this.signupForm	= new Cyph.UI.SignupForm(this.controller);
				}

				if (!Cyph.Env.isMobile && Cyph.Env.isIE) {
					this.dialogManager.alert({
						title: 'Warning',
						ok: 'ok',
						content: "We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n" +
						"IE doesn't work very well with Cyph (or in general).\n\nYou have been warned."
					});
				}
			}
		}
	}
}
