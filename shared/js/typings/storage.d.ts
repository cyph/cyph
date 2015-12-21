/**
 * This represents the local storage values used by Cyph.
 * @interface
 */
interface Storage {
	/** Indicates whether this Storage instance
		data is stored persistently. */
	isPersistent: string;

	/** Hash of current bootstrap payload. */
	webSignBootHash: string;

	/** Hash of previous bootstrap payload. */
	webSignBootHashOld: string;

	/** List of valid bootstrap payload hashes. */
	webSignBootHashWhitelist: string;

	/** Hash of current package. */
	webSignHash: string;

	/** Datetime that current package expires. */
	webSignHashExpires: string;

	/** Datetime that current package was released. */
	webSignHashTimestamp: string;

	/** If true, user will be prompted by WebSign
		before each package upgrade. */
	webSignManualUpgrades: string;

	/** Indicates whether the www subdomain's
		AppCache has been pinned. */
	webSignWWWPinned: string;
}
