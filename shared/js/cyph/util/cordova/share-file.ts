import {env} from '../../env';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {staticFileService} from '../static-services';

/** Shares file. */
export const shareFile = async (
	content: Uint8Array | Blob | string,
	fileName: string,
	mediaType?: string
) : Promise<void> => {
	if (!env.isCordovaMobile) {
		throw new Error('File sharing unsupported on this platform.');
	}

	const fileService = await staticFileService;

	const bytes =
		content instanceof Blob ?
			await potassiumUtil.fromBlob(content) :
			potassiumUtil.fromString(content);

	if (!mediaType && content instanceof Blob) {
		mediaType = content.type;
	}

	const fileMediaType =
		mediaType && mediaType.indexOf('/') > 0 ?
			mediaType :
			'application/octet-stream';

	await new Promise<void>((resolve, reject) => {
		(<any> self).plugins.socialsharing.shareWithOptions(
			{
				files: [fileService.toDataURI(bytes, fileMediaType)],
				subject: fileName
			},
			resolve,
			reject
		);
	});
};
