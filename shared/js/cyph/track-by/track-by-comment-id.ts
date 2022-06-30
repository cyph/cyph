/** Comment track by function. */
export const trackByCommentID = <
	T extends {
		author?: {username?: string};
		comment?: {id?: string};
	}
>(
	_I: number,
	{author, comment}: T
) => `${author?.username || ''}\n${comment?.id || ''}`;
