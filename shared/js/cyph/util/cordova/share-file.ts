import {env} from '../../env';
import {staticFileService} from '../static-services';

/** Shares file. */
export const shareFile = async (
	content: Uint8Array,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	if (!env.isCordovaMobile) {
		throw new Error('File sharing unsupported on this platform.');
	}

	const fileService = await staticFileService;

	const fileMediaType =
		mediaType && mediaType.indexOf('/') > 0 ?
			mediaType :
			'application/octet-stream';

	await new Promise<void>((resolve, reject) => {
		(<any> self).plugins.socialsharing.shareWithOptions(
			{
				files: [fileService.toDataURI(content, fileMediaType)],
				subject: fileName
			},
			resolve,
			reject
		);
	});
};
