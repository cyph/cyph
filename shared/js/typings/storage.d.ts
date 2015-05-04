/**
 * This represents the local storage values used by Cyph.
 * @interface
 */
interface Storage {
	/** Hash of current bootstrap payload. */
	webSignBootHash: string;

	/** Hash of previous bootstrap payload. */
	webSignBootHashOld: string;

	/** Hash of current package. */
	webSignHash: string;

	/** Datetime that current package expires. */
	webSignHashExpires: string;

	/** Datetime that current package was released. */
	webSignHashTimestamp: string;

	/** If true, user will be prompted by WebSign
		before each package upgrade. */
	webSignManualUpgrades: string;
}
