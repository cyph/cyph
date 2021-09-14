import {env} from '../env';

export const deleteBlob = async (id: string) => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const res = await fetch(`${env.baseUrl}blobs/${id}`, {method: 'DELETE'});

	if (res.status === 200) {
		return;
	}

	throw new Error(await res.text());
};

export const downloadBlob = async (id: string) => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const res = await fetch(`${env.baseUrl}blobs/${id}`);

	if (res.status === 200) {
		return new Uint8Array(await res.arrayBuffer());
	}

	throw new Error(await res.text());
};

export const uploadBlob = async (data: Uint8Array) => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const res = await fetch(`${env.baseUrl}blobs`, {
		body: data,
		method: 'PUT'
	});

	if (res.status === 200) {
		return res.text();
	}

	throw new Error(await res.text());
};
