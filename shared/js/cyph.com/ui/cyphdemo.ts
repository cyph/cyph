module Cyph.com {
	export module UI {
		/**
		 * Controls the Cyph chat demo.
		 */
		export class CyphDemo {
			private static messages: { text: string; isMobile: boolean; }[]	= [
				{text: 'hallo :beer:', isMobile: false},
				{text: 'u wanna cheat on ur wife with me', isMobile: false},
				{text: 'sry, cant', isMobile: true},
				{text: 'ok', isMobile: false},
				{text: 'hows the kids', isMobile: true},
				{text: 'kids is kill', isMobile: false},
				{text: 'no', isMobile: true},
				{text: 'sry', isMobile: false},
				{text: 'when funeral', isMobile: true},
				{text: 'yesterday', isMobile: false},
				{text: 'oh', isMobile: true}
			];


			/** Desktop chat UI. */
			public desktop: Cyph.UI.Chat.IChat;

			/** Mobile chat UI. */
			public mobile: Cyph.UI.Chat.IChat;

			/**
			 * Opens mobile sidenav menu.
			 */
			public openMobileMenu () : void {
				setTimeout(() =>
					this.mobileMenu.open()
				, 250);
			}

			/**
			 * @param controller
			 */
			public constructor(
				controller: Cyph.IController,
				dialogManager: Cyph.UI.IDialogManager,
				private mobileMenu: Cyph.UI.ISidebar
			) {
				if (Cyph.Env.isMobile) {
					return;
				}

				let mobileSession: Cyph.Session.ISession;
				const desktopSession: Cyph.Session.ISession	= new Cyph.Session.Session(
					null,
					controller,
					undefined,
					(desktopChannel: Cyph.Channel.LocalChannel) => {
						mobileSession	= new Cyph.Session.Session(
							null,
							controller,
							undefined,
							(mobileChannel: Cyph.Channel.LocalChannel) =>
								desktopChannel.connect(mobileChannel)
						);
					}
				);

				this.desktop	= new Cyph.UI.Chat.Chat(
					controller,
					dialogManager,
					{open: () => {}, close: () => {}},
					{notify: (message: string) => {}},
					false,
					desktopSession,
					Elements.demoRootDesktop
				);

				this.mobile		= new Cyph.UI.Chat.Chat(
					controller,
					dialogManager,
					this.mobileMenu,
					{notify: (message: string) => {}},
					true,
					mobileSession,
					Elements.demoRootMobile
				);

				Elements.demoRoot['appear']().one('appear', () => {
					let totalDelay: number	= 10000;

					CyphDemo.messages.forEach((message, i: number) => {
						totalDelay += i * 1000;

						setTimeout(() => {
							if (message.isMobile) {
								this.desktop.setFriendTyping(true);
							}
							else {
								this.mobile.setFriendTyping(true);
							}
						}, totalDelay);

						totalDelay += message.text.length * 10;

						setTimeout(() => {
							if (message.isMobile) {
								this.mobile.setFriendTyping(false);
								this.mobile.send(message.text);
							}
							else {
								this.desktop.setFriendTyping(false);
								this.desktop.send(message.text);
							}	
						}, totalDelay);
					});
				});
			}
		}
	}
}
