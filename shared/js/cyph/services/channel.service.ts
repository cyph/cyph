import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject, Subscription} from 'rxjs';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {LockFunction} from '../lock-function-type';
import {ChannelMessage, IChannelMessage, StringProto} from '../proto';
import {IChannelService} from '../service-interfaces/ichannel.service';
import {IChannelHandlers} from '../session';
import {lockFunction} from '../util/lock';
import {uuid} from '../util/uuid';
import {resolvable, waitForValue} from '../util/wait';
import {DatabaseService} from './database.service';


/** @inheritDoc */
@Injectable()
export class ChannelService implements IChannelService {
	/** @ignore */
	private readonly _STATE		= resolvable<{lock: LockFunction; url: string}>();

	/** @ignore */
	private ephemeral: boolean	= false;

	/** @ignore */
	private isClosed: boolean	= false;

	/** @ignore */
	private readonly localLock: LockFunction	= lockFunction();

	/** @ignore */
	private pauseLock?: Subject<void>;

	/** @ignore */
	private readonly resolveState: (state: {lock: LockFunction; url: string}) => void	=
		this._STATE.resolve
	;

	/** @ignore */
	private readonly state: Promise<{lock: LockFunction; url: string}>	= this._STATE.promise;

	/** @ignore */
	private readonly subscriptions: Subscription[]	= [];

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
	public destroy () : void {
		this.pauseOnMessage(true);

		for (const subscription of this.subscriptions) {
			subscription.unsubscribe();
		}
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

		this.subscriptions.push(this.databaseService.watchListPushes(
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
				await this.databaseService.removeItem(message.url).catch(() => {});
			}
		}));

		if (
			this.ephemeral ||
			(
				await this.databaseService.getList(`${url}/users`, StringProto).catch(
					() => <string[]> []
				)
			).indexOf(this.userID) < 0
		) {
			await this.databaseService.pushItem(`${url}/users`, StringProto, this.userID, true);
		}

		let isOpen	= false;
		this.subscriptions.push(this.databaseService.watchList(
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
		));
	}

	/** @inheritDoc */
	public async lock<T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) : Promise<T> {
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
		await this.localLock(async () => this.databaseService.pushItem<IChannelMessage>(
			`${(await this.state).url}/messages`,
			ChannelMessage,
			{author: await waitForValue(() => this.userID), cyphertext},
			true
		));
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
