import type {BehaviorSubject} from 'rxjs';
import type {IAsyncValue} from '../iasync-value';
import type {IProto} from '../iproto';
import type {IChannelHandlers} from '../session';

/**
 * Bidirectional network connection that sends and receives data.
 */
export interface IChannelService {
	/** Closes and deletes the channel. */
	close () : Promise<void>;

	/** Cleans things up and tears down event handlers. */
	destroy () : void;

	/** @see DatabaseService.getAsyncValue */
	getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		blockGetValue?: boolean
	) : Promise<IAsyncValue<T>>;

	/**
	 * Initializes service.
	 * @param userID If specified, will treat as long-lived channel. Else, will treat as ephemeral.
	 */
	init (
		channelID: string | undefined,
		channelSubID: string | undefined,
		userID: string | undefined,
		handlers: IChannelHandlers
	) : Promise<void>;

	/** @see DatabaseService.lock */
	lock<T> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T>;

	/** Sends a message through the channel. */
	send (cyphertext: Uint8Array) : Promise<void>;

	/** Creates and returns a new instance. */
	spawn () : IChannelService;
}
