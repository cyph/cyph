import type {ElementRef} from '@angular/core';

/**
 * Sets up element for product tour.
 */
export interface IProductTourDirective {
	/** Content for product tour. */
	readonly cyphProductTourContent: string;

	/** Order in product tour. */
	readonly cyphProductTourOrder: number;

	/** @see ElementRef */
	readonly elementRef: ElementRef<HTMLElement>;

	/** Indicates whether content needs to be translated. */
	readonly translate: boolean;
}
