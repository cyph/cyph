import {Injectable} from '@angular/core';
import {env} from '../cyph/env';
import {EnvService} from '../cyph/services/env.service';
import {ChatData} from './chat-data';


/**
 * Replaces a subset of the env service for the demo chat UI in certain cases.
 */
@Injectable()
export class DemoEnvService extends EnvService {
	/** @ignore */
	private chatData: ChatData|undefined;

	/** Initialise service. */
	public init (chatData: ChatData) : void {
		this.chatData	= chatData;
	}

	/** @inheritDoc */
	public get isMobile () : boolean {
		return this.chatData ? this.chatData.isMobile : env.isMobile;
	}

	/** @ignore */
	public set isMobile (_: boolean) {}

	constructor () {
		super();
	}
}
