module Cyph {
	export module UI {
		export module Chat {
			export interface IChat {
				isConnected: boolean;

				isDisconnected: boolean;

				isFriendTyping: boolean;

				isMobile: boolean;

				currentMessage: string;

				state: States;

				messages: {
					author: Session.Authors;
					text: string,
					timestamp: string;
				}[];

				cyphertext: ICyphertext;

				photoManager: IPhotoManager;

				p2pManager: IP2PManager;

				scrollManager: IScrollManager;

				session: Session.ISession;

				abortSetup () : void;

				addMessage (
					text: string,
					author: Session.Authors,
					shouldNotify?: boolean
				) : void;

				begin (callback?: Function) : void;

				changeState (state: States) : void;

				close () : void;

				disconnectButton () : void;

				formattingHelpButton () : void;

				messageChange () : void;

				send (message?: string) : void;

				setConnected () : void;

				setFriendTyping (isFriendTyping: boolean) : void;
			}
		}
	}
}
