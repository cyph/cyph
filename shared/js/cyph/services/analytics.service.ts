import {Injectable} from '@angular/core';
import {Analytics} from '../analytics';
import {EnvService} from './env.service';


/** @inheritDoc */
@Injectable()
export class AnalyticsService extends Analytics {
	constructor (envService: EnvService) {
		super(envService);
	}
}
