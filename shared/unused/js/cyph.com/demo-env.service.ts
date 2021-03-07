import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {env} from '../cyph/env';
import {EnvService} from '../cyph/services/env.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {ChatData} from './chat-data';

/**
 * Replaces a subset of the env service for the demo chat UI in certain cases.
 */
@Injectable()
export class DemoEnvService extends EnvService {
	/** @inheritDoc */
	public readonly isMobile: BehaviorSubject<boolean> = new BehaviorSubject(
		env.isMobile.value
	);

	/** Initializes service. */
	public init (chatData: ChatData) : void {
		this.isMobile.next(chatData.isMobile);
	}

	constructor (localStorageService: LocalStorageService) {
		super(localStorageService);
	}
}
