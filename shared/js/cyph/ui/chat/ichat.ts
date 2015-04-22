module Cyph {
	export module UI {
		export module Chat {
			export interface IChat {
				isConnected: boolean;

				isDisconnected: boolean;

				isFriendTyping: boolean;

				unreadMessages: number;

				currentMessage: string;

				state: States;

				messages: {
					author: Session.Authors;
					authorClass: string;
					isFromApp: boolean;
					isFromFriend: boolean;
					isFromMe: boolean;
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

				changeState (state: States) : void;

				begin (callback?: Function) : void;

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
