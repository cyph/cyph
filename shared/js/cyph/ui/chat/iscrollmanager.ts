module Cyph {
	export module UI {
		export module Chat {
			export interface IScrollManager {
				unreadMessages: number;

				scrollDown (shouldScrollCyphertext?: boolean) : void;
			}
		}
	}
}
