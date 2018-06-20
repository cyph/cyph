import {env} from '../env';


/** Logs to console in local env. */
export const log	= (...args: any[]) : void => {
	if (env.debug) {
		/* tslint:disable-next-line:no-console */
		console.log(...args);
	}
};
