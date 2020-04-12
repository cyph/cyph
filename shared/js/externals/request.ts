/* eslint-disable */

import {request} from '../cyph/util/request';

/** @file request external. */

/* Temporary workaround for universal-analytics */
export const post: any = (path: string, options: any, callback: any) => {
	request({
		contentType: '',
		data: options.body,
		headers: options.headers,
		method: 'post',
		url:
			path.startsWith('http://') || path.startsWith('https://') ?
				path :
				`http://${path}`
	})
		.then(() => {
			callback();
		})
		.catch(err => {
			callback(err ? err : new Error('Request failed.'));
		});
};
