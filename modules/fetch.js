#!/usr/bin/env node

import AbortController from 'abort-controller';
import FormDataInternal from 'form-data';
import fetchInternal from 'node-fetch';

export const fetch = async (url, options = {}, responseType = 'text') => {
	const fetchHandler = o => {
		if (!o.ok) {
			throw new Error(`Request failure: ${url}`);
		}

		return o[responseType]();
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
