module Cyph {
	export module UI {
		export module Chat {
			export interface ICyphertext {
				messages: {author: Session.Authors; text: string;}[];

				hide () : void;

				log (text: string, author: Session.Authors) : void;

				show () : void;
			}
		}
	}
}
