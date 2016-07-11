/**
 * This represents the local storage values used by Cyph.
 * @interface
 */
interface Storage {
	/** Indicates whether this Storage instance
		data is stored persistently. */
	isPersistent: string;

	/** Datetime that current package expires. */
	webSignExpires: string;

	/** Hash of current bootstrap payload. */
	webSignHash: string;

	/** Hash of previous bootstrap payload. */
	webSignHashOld: string;

	/** List of valid bootstrap payload hashes. */
	webSignHashWhitelist: string;

	/** Hash of current package. */
	webSignPackageHash: string;

	/** Hash of current package. */
	webSignPackageUrl: string;

	/** Datetime that current package was released. */
	webSignTimestamp: string;

	/** Indicates whether the www subdomain's
		AppCache has been pinned. */
	webSignWWWPinned: string;
}
