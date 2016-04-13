namespace Cyph {
	export namespace UI {
		export namespace Chat {
			/**
			 * Manages images within a chat.
			 * @interface
			 */
			export interface IPhotoManager {
				/**
				 * Sends image selected by elem.
				 * @param elem
				 */
				insert (elem: HTMLInputElement) : void;
			}
		}
	}
}
