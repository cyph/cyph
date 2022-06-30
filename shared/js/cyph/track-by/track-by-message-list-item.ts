import {IMessageListItem} from '../chat/imessage-list-item';
import {ListHoleError} from '../list-hole-error';

/** IMessageListItem track by function. */
export const trackByMessageListItem = <T extends IMessageListItem>(
	_I: number,
	item: T
) =>
	typeof item.message === 'string' ?
		item.message :
	item.message instanceof ListHoleError ?
		item.message :
	item.message ?
		item.message.id :
		'id';
