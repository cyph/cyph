import {Observable} from 'rxjs';
import {IAsyncList} from '../iasync-list';
import {IAsyncMap} from '../iasync-map';
import {IAccountPost} from '../proto';

/** A subset of a user's post data. */
export interface IAccountPostDataPart {
	/** Gets post value. */
	getPost: (id: string) => Promise<IAccountPost>;

	/** List of post IDs. */
	ids: IAsyncList<string>;

	/** Map of IDs to posts. */
	posts: IAsyncMap<string, IAccountPost>;

	/** Watches post value. */
	watchPost: (id: string) => Observable<IAccountPost>;
}

/** User social networking post data. */
export interface IAccountPostData {
	/** All posts (public and private). */
	private: () => Promise<IAccountPostDataPart>;

	/** Public posts. */
	public: () => IAccountPostDataPart;
}
