module Cyph {
	export module UI {
		/**
		 * Represents a slide-out menu component.
		 * @interface
		 */
		export interface ISidebar {
			/**
			 * Opens the sidebar.
			 */
			open () : void;

			/**
			 * Closes the sidebar.
			 */
			close () : void;
		}
	}
}
