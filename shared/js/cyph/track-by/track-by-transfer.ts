import {TrackByFunction} from '@angular/core';
import {IFileTransfer} from '../proto';

/** Transfer track by function. */
export const trackByTransfer: TrackByFunction<{metadata: IFileTransfer}> = (
	_,
	item
) => item.metadata.id;
