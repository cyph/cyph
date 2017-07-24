import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {ISessionService} from '../service-interfaces/isession.service';
import {IChannelHandlers} from '../session';


/**
 * Bidirectional network connection that sends and receives data.
 */
export interface IChannelService {
	/** Closes and deletes the channel. */
	close () : Promise<void>;

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
		sessionService: ISessionService,
		channelID: string|undefined,
		userID: string|undefined,
		handlers: IChannelHandlers
	) : Promise<void>;

	/** @see DatabaseService.lock */
	lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T>;

	/** Sends a message through the channel. */
	send (cyphertext: Uint8Array) : Promise<void>;
}
