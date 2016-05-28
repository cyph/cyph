/**
 * Contains enums for UI-related events.
 */
export namespace UIEvents {
	/**
	 * P2P UI event categories.
	 */
	export enum Categories {
		base,
		request
	}

	/**
	 * P2P UI events. View code for a breakdown by category.
	 */
	export enum Events {
		/* base */
		connected,
		enable,
		videoToggle,

		/* request */
		acceptConfirm,
		acceptConfirmation,
		requestConfirm,
		requestConfirmation,
		requestRejection
	}
}
