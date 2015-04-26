module Cyph {
	export module P2P {
		export module UIEvents {
			export enum Categories {
				base,
				file,
				request,
				stream
			}

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
