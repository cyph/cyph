import {IFileTransfer} from '../proto/types';

/** Transfer track by function. */
export const trackByTransfer = <T extends {metadata: IFileTransfer}>(
	_I: number,
	item: T
) => item.metadata.id;
