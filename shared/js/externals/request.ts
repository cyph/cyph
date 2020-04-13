/* eslint-disable */

import {envDeploy} from '../cyph/env-deploy';

/** @file request external. */

/* Temporary workaround for universal-analytics */
export const post: any = (path: string, options: any, callback: any) => {
	/* Reduce size / drop Angular dependency on cyph.com home page */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	fetch(
		path.startsWith('http://') || path.startsWith('https://') ?
			path :
		envDeploy.baseUrl.startsWith('https://') ?
			`https://${path}` :
			`http://${path}`,
		{
			body: options.body,
			headers: options.headers,
			method: 'post'
		}
	)
		.then(() => {
			callback();
		})
		.catch(err => {
			callback(err ? err : new Error('Request failed.'));
		});
};
