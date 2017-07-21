import {Injectable} from '@angular/core';
import {ChannelMessage} from '../../proto';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {LockFunction} from '../lock-function-type';
import {StringProto} from '../protos';
import {IChannelHandlers} from '../session';
import {util} from '../util';
import {DatabaseService} from './database.service';


/**
 * Bidirectional network connection that sends and receives data.
 */
@Injectable()
export class ChannelService {
	/** @ignore */
	private ephemeral: boolean	= false;

	/** @ignore */
	private isClosed: boolean	= false;

	/** @ignore */
	private readonly localLock: LockFunction	= util.lockFunction();

	/** @ignore */
	private resolveState: (state: {lock: LockFunction; url: string}) => void;

	/** @ignore */
	private readonly state: Promise<{lock: LockFunction; url: string}>	=
		new Promise<{lock: LockFunction; url: string}>(resolve => {
			this.resolveState	= resolve;
		})
	;

	/** @ignore */
	private userID?: string;

	/** This kills the channel. */
	public async close () : Promise<void> {
		if (this.isClosed) {
			return;
		}

		this.isClosed	= true;

		await this.databaseService.removeItem((await this.state).url);
	}

	/** @see DatabaseService.getAsyncValue */
	public async getAsyncValue<T> (url: string, proto: IProto<T>) : Promise<IAsyncValue<T>> {
		return this.databaseService.getAsyncValue(`${(await this.state).url}/${url}`, proto);
	}

	/**
	 * Initializes service.
	 * @param channelID ID of this channel.
	 * @param userID If specified, will treat as long-lived channel. Else, will treat as ephemeral.
	 * @param handlers Event handlers for this channel.
	 */
	public async init (
		channelID: string,
		userID: string|undefined,
		handlers: IChannelHandlers
	) : Promise<void> {
		const url	= `channels/${channelID}`;

		this.resolveState({lock: this.databaseService.lockFunction(`${url}/lock`), url});

		if (userID) {
			this.userID	= userID;
		}
		else {
			this.ephemeral	= true;
			this.userID		= util.uuid();
			this.databaseService.setDisconnectTracker(`${url}/disconnects/${this.userID}`);
		}

		let isOpen	= false;
		const usersSubscription	= this.databaseService.watchList(
			`${url}/users`,
			StringProto
		).subscribe(
			users => {
				if (users.length < 1) {
					return;
				}
				if (!isOpen) {
					isOpen	= true;
					handlers.onOpen(users[0].value === this.userID);
				}
				if (users.length < 2) {
					return;
				}
				usersSubscription.unsubscribe();
				handlers.onConnect();
			},
			err => {
				handlers.onClose();
				throw err;
			}
		);

		this.databaseService.watchListPushes(
			`${url}/messages`,
			ChannelMessage,
			true,
			true
		).subscribe(
			message => {
				if (message.value.author !== this.userID) {
					handlers.onMessage(message.value.cyphertext);
				}
			},
			err => {
				handlers.onClose();
				throw err;
			},
			() => {
				handlers.onClose();
			}
		);

		if (
			this.ephemeral ||
			(
				await this.databaseService.getList(`${url}/users`, StringProto).catch(() => [])
			).indexOf(this.userID) < 0
		) {
			this.databaseService.pushItem(`${url}/users`, StringProto, this.userID);
		}
	}

	/** @see DatabaseService.lock */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		return (await this.state).lock(f, reason);
	}

	/** Sends message through this channel. */
	public send (cyphertext: Uint8Array) : void {
		this.localLock(async () => this.databaseService.pushItem(
			`${(await this.state).url}/messages`,
			ChannelMessage,
			{author: await util.waitForValue(() => this.userID), cyphertext}
		));
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
