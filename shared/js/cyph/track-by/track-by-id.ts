import {TrackByFunction} from '@angular/core';


/** ID-containing-object track by function. */
export const trackByID: TrackByFunction<{id: string}>	= (_, item) => item.id;
