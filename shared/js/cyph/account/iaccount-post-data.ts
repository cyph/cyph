import {Observable} from 'rxjs';
import {ITimedValue} from '../itimed-value';
import {IAccountPost} from '../proto';

/** A subset of a user's post data. */
export interface IAccountPostDataPart {
	/** Gets list of IDs. */
	getIDs: () => Promise<string[]>;

	/** Gets post value. */
	getPost: (id: string) => Promise<IAccountPost>;

	/** Gets list of IDs with timestamps. */
	getTimedIDs: () => Promise<ITimedValue<string>[]>;

	/** Checks if post data exists. */
	hasPost: (id: string) => Promise<boolean>;

	/** Pushes ID. */
	pushID: (id: string) => Promise<void>;

	/** Removes post data. */
	removePost: (id: string) => Promise<void>;

	/** Sets post data. */
	setPost: (id: string, post: IAccountPost) => Promise<void>;

	/** Updates post data. */
	updatePost: (
		id: string,
		f: (post?: IAccountPost) => Promise<IAccountPost>
	) => Promise<void>;

	/** Watches list of IDs. */
	watchIDs: () => Observable<string[]>;

	/** Watches post value. */
	watchPost: (id: string) => Observable<IAccountPost>;
}

/** User social networking post data. */
export interface IAccountPostData {
	/** All posts (public and private). */
	private: () => Promise<IAccountPostDataPart>;

	/** Public posts. */
	public: IAccountPostDataPart;
}
