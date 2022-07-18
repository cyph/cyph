import {Observable} from 'rxjs';
import {User} from '../account';
import {ITimedValue} from '../itimed-value';
import {IAccountPost, IAccountPostComment} from '../proto/types';

/** A subset of a user's post data. */
export interface IAccountPostDataPart {
	/** Gets list of comments on post. */
	getComments: (
		id: string
	) => Promise<{author: User | undefined; comment: IAccountPostComment}[]>;

	/** Gets list of IDs. */
	getIDs: () => Promise<string[]>;

	/** Gets post value. */
	getPost: (id: string) => Promise<IAccountPost>;

	/** Gets list of IDs with timestamps. */
	getTimedIDs: () => Promise<ITimedValue<string>[]>;

	/** Checks if post data exists. */
	hasPost: (id: string) => Promise<boolean>;

	/** Pushes comment ID. */
	pushCommentID: (postID: string, commentID: string) => Promise<void>;

	/** Pushes ID. */
	pushID: (id: string) => Promise<void>;

	/** Removes post data. */
	removePost: (id: string) => Promise<void>;

	/** Sets comment data. */
	setComment: (
		commentID: string,
		comment: IAccountPostComment
	) => Promise<void>;

	/** Sets post data. */
	setPost: (id: string, post: IAccountPost) => Promise<void>;

	/** Updates comment data. */
	updateComment: (
		commentID: string,
		f: (comment?: IAccountPostComment) => Promise<IAccountPostComment>
	) => Promise<void>;

	/** Updates post data. */
	updatePost: (
		id: string,
		f: (post?: IAccountPost) => Promise<IAccountPost>
	) => Promise<void>;

	/** Watches list of comments on post. */
	watchComments: (
		id: string
	) => Observable<{author: User | undefined; comment: IAccountPostComment}[]>;

	/** Watches list of IDs. */
	watchIDs: () => Observable<string[]>;

	/** Watches post value. */
	watchPost: (id: string) => Observable<IAccountPost | undefined>;
}

/** User social networking post data. */
export interface IAccountPostData {
	/** All posts (public and private). */
	private: () => Promise<IAccountPostDataPart>;

	/** Public posts. */
	public: IAccountPostDataPart;
}
