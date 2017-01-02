import {Injectable} from '@angular/core';
import {analytics} from '../../analytics';
import {IMessage} from '../../session/imessage';
import {ISession} from '../../session/isession';
import {ThreadedSession} from '../../session/threaded-session';
import {AbstractSessionIdService} from './abstract-session-id.service';


/**
 * Manages a session.
 */
@Injectable()
export class SessionService {
	/** @see ISession */
	private readonly session: ISession;

	/** API flags passed into this session. */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false
	};

	/** @see ISession.close */
	public close () : void {
		this.session.close();
	}

	/** @see ISession.off */
	public off<T> (event: string, handler: (data: T) => void) : void {
		this.session.off<T>(event, handler);
	}

	/** @see ISession.on */
	public on<T> (event: string, handler: (data: T) => void) : void {
		this.session.on<T>(event, handler);
	}

	/** @see ISession.one */
	public async one<T> (event: string) : Promise<T> {
		return this.session.one<T>(event);
	}

	/** @see ISession.send */
	public async send (...messages: IMessage[]) : Promise<void> {
		return this.session.send(...messages);
	}

	/** @see ISession.sendText */
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.session.sendText(text, selfDestructTimeout);
	}

	/** @see ISession.state */
	public get state () : {
		cyphId: string;
		isAlice: boolean;
		isAlive: boolean;
		isStartingNewCyph: boolean;
		sharedSecret: string;
		wasInitiatedByAPI: boolean;
	} {
		return this.session.state;
	}

	/** @see ISession.trigger */
	public trigger (event: string, data?: any) : void {
		this.session.trigger(event, data);
	}

	constructor (abstractSessionIdService: AbstractSessionIdService) {
		let id	= abstractSessionIdService.id;

		/* API flags */
		for (const flag of [
			/* Modest branding */
			{
				analEvent: 'modest-branding',
				character: '&',
				set: () => { this.apiFlags.modestBranding = true; }
			},
			/* Force TURN */
			{
				analEvent: 'force-turn',
				character: '$',
				set: () => { this.apiFlags.forceTURN = true; }
			},
			/* Native crypto */
			{
				analEvent: 'native-crypto',
				character: '%',
				set: () => { this.apiFlags.nativeCrypto = true; }
			}
		]) {
			if (id[0] !== flag.character) {
				continue;
			}

			id	=
				id.substring(1) +
				(id.length > 1 ? 'a' : '')
			;

			flag.set();

			analytics.sendEvent({
				eventAction: 'used',
				eventCategory: flag.analEvent,
				eventValue: 1,
				hitType: 'event'
			});
		}

		this.session	= new ThreadedSession(
			id,
			this.apiFlags.nativeCrypto
		);
	}
}
