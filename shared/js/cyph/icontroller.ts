module Cyph {
	/**
	 * Responsible for keeping data and UI in sync.
	 * @interface
	 */
	export interface IController {
		/**
		 * Synchronise data and UI.
		 */
		update () : void;
	}
}
