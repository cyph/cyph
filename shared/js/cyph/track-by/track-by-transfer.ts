import {TrackByFunction} from '@angular/core';
import {IFileTransfer} from '../proto/types';

/** Transfer track by function. */
export const trackByTransfer: TrackByFunction<{metadata: IFileTransfer}> = (
	_,
	item
) => item.metadata.id;
