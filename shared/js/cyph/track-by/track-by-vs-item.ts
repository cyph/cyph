import {TrackByFunction} from '@angular/core';
import {IVsItem} from '../chat/ivs-item';


/** IVsItem track by function. */
export const trackByVsItem: TrackByFunction<IVsItem>	= (_, item) =>
	item.message ? item.message.id : 'id'
;
