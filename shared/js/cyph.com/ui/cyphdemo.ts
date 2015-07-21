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
			public desktop: DummyChat;

			/** Mobile chat UI. */
			public mobile: DummyChat;

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

				this.desktop	= new DummyChat(
					controller,
					dialogManager,
					{open: () => {}, close: () => {}},
					false
				);

				this.mobile		= new DummyChat(
					controller,
					dialogManager,
					mobileMenu,
					true
				);

				this.desktop.connectChat(this.mobile);
				this.mobile.connectChat(this.desktop);

				let totalDelay: number	= 0;

				CyphDemo.messages.forEach((message, i: number) => {
					totalDelay += i * 1500;

					setTimeout(() => {
						if (message.isMobile) {
							this.desktop.setFriendTyping(true);
						}
						else {
							this.mobile.setFriendTyping(true);
						}
					}, totalDelay);

					totalDelay += message.text.length * 50;

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
			}
		}
	}
}
