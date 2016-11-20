import {ITimer} from '../itimer';


/**
 * Represents a link-based initial connection screen
 * (e.g. for starting a new cyph).
 */
export interface ILinkConnection {
	/** Indicates whether the advanced features menu is open. */
	advancedFeatures: boolean;

	/** Indicates whether this link connection was initiated passively via API integration. */
	isPassive: boolean;

	/** The link to join this connection. */
	link: string;

	/** URL-encoded version of this link (for sms and mailto links). */
	linkEncoded: string;

	/** Counts down until link expires. */
	timer: ITimer;

	/**
	 * Extends the countdown duration.
	 * @param milliseconds
	 */
	addTime (milliseconds: number) : void;

	/**
	 * Initiates UI for sending this link to friend.
	 * @param baseUrl Base URL before the hash.
	 * @param secret Secret being sent via URL fragment.
	 * @param isPassive
	 */
	beginWaiting (baseUrl: string, secret: string, isPassive: boolean) : Promise<void>;

	/** Copies link to clipboard. */
	copyToClipboard () : Promise<void>;

	/** Stops waiting and tears down this link connection instance. */
	stop () : void;
}
