import {env} from '../env';

/** Deletes a server-side blob of data associated with the given ID. */
export const deleteBlob = async (id: string) : Promise<void> => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const res = await fetch(`${env.baseUrl}blobs/${id}`, {method: 'DELETE'});

	if (res.status === 200) {
		return;
	}

	throw new Error(await res.text());
};

/** Downloads a server-side blob of data associated with the given ID. */
export const downloadBlob = async (id: string) : Promise<Uint8Array> => {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const res = await fetch(`${env.baseUrl}blobs/${id}`);

	if (res.status === 200) {
		return new Uint8Array(await res.arrayBuffer());
	}

	throw new Error(await res.text());
};

/** Uploads a blob of data and returns the server-generated ID. */
export const uploadBlob = async (data: Uint8Array) : Promise<string> => {
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
