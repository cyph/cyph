#!/usr/bin/env node

import AbortController from 'abort-controller';
import fetchInternal from 'node-fetch';

export const fetch = async (url, options = {}) => {
	const fetchHandler = o => {
		if (!o.ok) {
			throw new Error(`Request failure: ${url}`);
		}

		return o;
	};

	const timeout = options.timeout;
	options.timeout = undefined;

	if (!timeout) {
		return fetchInternal(url, options).then(fetchHandler);
	}

	const abortController = new AbortController();
	options.signal = abortController.signal;

	let timeoutID;

	return Promise.race([
		fetchInternal(url, options).then(o => {
			clearTimeout(timeoutID);
			return fetchHandler(o);
		}),
		new Promise((_, reject) => {
			timeoutID = setTimeout(() => {
				reject('Request timeout exceeded.');
				abortController.abort();
			}, timeout);
		})
	]);
};
