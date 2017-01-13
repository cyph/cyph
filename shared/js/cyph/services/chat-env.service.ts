import {Injectable} from '@angular/core';
import {env} from '../env';
import {AbstractSessionInitService} from './abstract-session-init.service';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';
import {SessionService} from './session.service';


/**
 * Replaces a subset of the env service for the chat UI in certain cases.
 */
@Injectable()
export class ChatEnvService extends EnvService {
	/** EnvService.newCyphUrl adjusted for session API flags and initial call type. */
	public get newCyphUrl () : string {
		const flags		=
			this.configService.apiFlags.map(o => o.get(this.sessionService)).join('')
		;

		const baseUrl	=
			this.abstractSessionInitService.callType === 'audio' ?
				env.cyphAudioBaseUrl :
				this.abstractSessionInitService.callType === 'video' ?
					env.cyphVideoBaseUrl :
					env.newCyphUrl
		;

		const divider	= baseUrl.indexOf('#') < 0 ? '#' : '';

		return flags.length > 0 ? `${baseUrl}${divider}${flags}` : baseUrl;
	}

	/** @ignore */
	public set newCyphUrl (_: string) {}

	constructor (
		/** @ignore */
		private readonly abstractSessionInitService: AbstractSessionInitService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();
	}
}
