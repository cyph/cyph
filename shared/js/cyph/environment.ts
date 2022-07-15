import {environment as baseEnvironment} from '../environments/environment';
import {IEnvironment} from './proto/types';

/** @inheritDoc */
export const environment: IEnvironment =
	typeof mainThreadEnvironment !== 'undefined' ?
		mainThreadEnvironment :
		baseEnvironment;
