import {TrackByFunction} from '@angular/core';

/** Comment track by function. */
export const trackByCommentID: TrackByFunction<{
	author?: {username?: string};
	comment?: {id?: string};
}> = (_, {author, comment}) =>
	`${author?.username || ''}\n${comment?.id || ''}`;
