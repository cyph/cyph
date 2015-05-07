module Cyph {
	export module P2P {
		/**
		 * Contains enums for UI-related events.
		 */
		export module UIEvents {
			/**
			 * P2P UI event categories.
			 */
			export enum Categories {
				base,
				file,
				request,
				stream
			}

			/**
			 * P2P UI events. View code for a breakdown by category.
			 */
			export enum Events {
				/* base */
				connected,
				enable,
				videoToggle,

				/* file */
				clear,
				confirm,
				get,
				rejected,
				tooLarge,
				transferStarted,

				/* request */
				acceptConfirm,
				acceptConfirmation,
				requestConfirm,
				requestConfirmation,
				requestRejection,

				/* stream */
				play,
				set
			}
		}
	}
}
