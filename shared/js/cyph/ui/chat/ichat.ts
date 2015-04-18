/// <reference path="cyphertext.ts" />
/// <reference path="enums.ts" />
/// <reference path="p2pmanager.ts" />
/// <reference path="photomanager.ts" />
/// <reference path="../../icontroller.ts" />
/// <reference path="../../session/enums.ts" />
/// <reference path="../../session/isession.ts" />
/// <reference path="../../../global/base.ts" />


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

				messages: {author: Session.Authors; text: string;}[];

				cyphertext: Cyphertext;

				photoManager: PhotoManager;

				p2pManager: P2PManager;

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
