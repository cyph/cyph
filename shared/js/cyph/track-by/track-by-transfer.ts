import {TrackByFunction} from '@angular/core';
import {ISessionTransfer} from '../files/isession-transfer';


/** Transfer track by function. */
export const trackByTransfer: TrackByFunction<{metadata: ISessionTransfer}>	= (_, item) =>
	item.metadata.id
;
