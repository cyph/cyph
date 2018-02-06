import {SafeUrl} from '@angular/platform-browser';
import {Async} from './async-type';


/** Options for a search bar. */
export interface ISearchOptions {
	/** Image alt text, required for displaying item images. */
	imageAltText?: string;

	/** Search items. */
	items: {
		image: Async<SafeUrl|string|undefined>;
		matchingText?: string;
		smallText: Async<string|undefined>;
		text: Async<string|undefined>;
		value: number|string;
	}[];

	/** Top search option with a link. */
	topOption?: {
		routerLink: string;
		text: string;
	};
}
