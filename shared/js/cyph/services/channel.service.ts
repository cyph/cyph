import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {LockFunction} from '../lock-function-type';
import {ChannelMessage, StringProto} from '../proto';
import {IChannelService} from '../service-interfaces/ichannel.service';
import {IChannelHandlers} from '../session';
import {lockFunction} from '../util/lock';
import {uuid} from '../util/uuid';
import {sleep, waitForValue} from '../util/wait';
import {DatabaseService} from './database.service';


/** @inheritDoc */
@Injectable()
export class ChannelService implements IChannelService {
	/** @ignore */
	private ephemeral: boolean	= false;

	/** @ignore */
	private isClosed: boolean	= false;

	/** @ignore */
	private readonly localLock: LockFunction	= lockFunction();

	/** @ignore */
	private pauseLock?: Subject<void>;

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

	/** @inheritDoc */
	public async close () : Promise<void> {
		if (this.isClosed || !this.ephemeral) {
			return;
		}

		this.isClosed	= true;

		await this.databaseService.removeItem((await this.state).url);
	}

	/** @inheritDoc */
	public async getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		blockGetValue?: boolean
	) : Promise<IAsyncValue<T>> {
		return this.databaseService.getAsyncValue(
			`${(await this.state).url}/${url}`,
			proto,
			undefined,
			blockGetValue
		);
	}

	/** @inheritDoc */
	public async init (
		channelID: string|undefined,
		userID: string|undefined,
		handlers: IChannelHandlers
	) : Promise<void> {
		if (!channelID) {
			throw new Error('Invalid channel ID.');
		}

		const url	= `channels/${channelID}`;

		this.resolveState({lock: this.databaseService.lockFunction(`${url}/lock`), url});

		if (userID) {
			this.userID	= userID;
		}
		else {
			this.ephemeral	= true;
			this.userID		= uuid();
			this.databaseService.setDisconnectTracker(`${url}/disconnects/${this.userID}`);
		}

		this.databaseService.watchListPushes(
			`${url}/messages`,
			ChannelMessage,
			undefined,
			true
		).subscribe(async message => {
			if (message.value.author === this.userID) {
				return;
			}

			if (this.pauseLock) {
				await this.pauseLock.toPromise();
			}

			await handlers.onMessage(message.value.cyphertext);

			if (!this.ephemeral) {
				await sleep(600000);
				await this.databaseService.removeItem(message.url).catch(() => {});
			}
		});

		if (
			this.ephemeral ||
			(
				await this.databaseService.getList(`${url}/users`, StringProto).catch(() => [])
			).indexOf(this.userID) < 0
		) {
			await this.databaseService.pushItem(`${url}/users`, StringProto, this.userID);
		}

		let isOpen	= false;
		this.databaseService.watchList(
			`${url}/users`,
			StringProto,
			true
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
				handlers.onConnect();
			},
			err => {
				handlers.onClose();
				throw err;
			},
			() => {
				handlers.onClose();
			}
		);
	}

	/** @inheritDoc */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		return (await this.state).lock(f, reason);
	}

	/** Pauses handling of new messages. */
	public pauseOnMessage (pause: boolean) : void {
		if (pause && !this.pauseLock) {
			this.pauseLock	= new Subject();
		}
		else if (!pause && this.pauseLock) {
			this.pauseLock.complete();
			this.pauseLock	= undefined;
		}
	}

	/** @inheritDoc */
	public async send (cyphertext: Uint8Array) : Promise<void> {
		await this.localLock(async () => this.databaseService.pushItem(
			`${(await this.state).url}/messages`,
			ChannelMessage,
			{author: await waitForValue(() => this.userID), cyphertext}
		));
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
