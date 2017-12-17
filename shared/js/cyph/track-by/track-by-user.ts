import {TrackByFunction} from '@angular/core';
import {User} from '../account/user';


/** User track by function. */
export const trackByUser: TrackByFunction<User>	= (_, item) => item.username;
