import {TrackByFunction} from '@angular/core';
import {IMessageListItem} from '../chat/imessage-list-item';

/** IMessageListItem track by function. */
export const trackByMessageListItem: TrackByFunction<IMessageListItem> = (
	_,
	item
) =>
	typeof item.message === 'string' ?
		item.message :
	item.message ?
		item.message.id :
		'id';
