import {util} from '@cyph/sdk';
import {getURL, storage} from '../init.js';

const {retryUntilSuccessful} = util;

export const itemHashChange = async ({data: {after: data}, params}) => {
	if (!data.exists()) {
		return;
	}

	const hash = data.val();

	if (typeof hash !== 'string') {
		return;
	}

	const url = getURL(data.adminRef.parent);

	const files = await Promise.all(
		(await storage.getFiles({prefix: `${url}/`}))[0].map(async file => {
			const [metadata] = await file.getMetadata();

			return {
				file,
				name: metadata.name.split('/').slice(-1)[0],
				timestamp: new Date(metadata.updated).getTime()
			};
		})
	);

	for (const o of files.sort((a, b) => a.timestamp > b.timestamp)) {
		if (o.name === hash) {
			return;
		}

		await retryUntilSuccessful(async () => {
			const [exists] = await o.file.exists();
			if (!exists) {
				return;
			}

			await o.file.delete();
		});
	}
};
