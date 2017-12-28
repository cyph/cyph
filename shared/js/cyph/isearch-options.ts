import {TrackByFunction} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {Async} from './async-type';


/** Options for a search bar. */
export interface ISearchOptions {
	/** Image alt text, required for displaying item images. */
	imageAltText?: string;

	/** Search items. */
	items: {
		image?: SafeUrl|string|Async<SafeUrl|string|undefined>;
		smallText?: string|Async<string|undefined>;
		text?: string|Async<string|undefined>;
		value: any;
	}[];

	/** Top search option with a link. */
	topOption?: {
		routerLink: string;
		text: string;
	};

	/** @see TrackByFunction */
	trackBy: TrackByFunction<any>;
}
