#!/usr/bin/env node

import AbortController from 'abort-controller';
import fetchInternal, {FormData as FormDataInternal} from 'node-fetch';

export const fetch = async (url, options = {}, responseType = 'text') => {
	const fetchHandler = o => {
		if (!o.ok) {
			console.error(o);
			throw new Error(`Request failure: ${url}`);
		}

		return o[responseType]();
	};

	const {timeout} = options;

	if (!timeout) {
		return fetchInternal(url, options).then(fetchHandler);
	}

	const abortController = new AbortController();
	options.signal = abortController.signal;
	options.timeout = undefined;

	let timeoutID;

	return Promise.race([
		fetchInternal(url, options)
			.then(fetchHandler)
			.then(o => {
				clearTimeout(timeoutID);
				return o;
			}),
		new Promise((_, reject) => {
			timeoutID = setTimeout(() => {
				reject('Request timeout exceeded.');
				abortController.abort();
			}, timeout);
		})
	]);
};

export const FormData = FormDataInternal;
