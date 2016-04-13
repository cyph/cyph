namespace Cyph {
	export namespace UI {
		export namespace Chat {
			/**
			 * Chat-specific UI elements.
			 * @interface
			 */
			export interface IElements {
				buttons: JQuery;
				cyphertext: JQuery;
				everything: JQuery;
				insertPhotoMobile: JQuery;
				messageBox: JQuery;
				messageList: JQuery;
				messageListInner: JQuery;
				p2pContainer: JQuery;
				p2pFiles: JQuery;
				p2pFriendPlaceholder: JQuery;
				p2pFriendStream: JQuery;
				p2pMeStream: JQuery;
				sendButton: JQuery;
				timer: JQuery;
			}
		}
	}
}
