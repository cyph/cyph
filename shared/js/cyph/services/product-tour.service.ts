import {ElementRef, Injectable} from '@angular/core';
import introJs from 'intro.js';
import {IntroJs} from 'intro.js/src/intro';
import {BaseProvider} from '../base-provider';
import {IProductTourDirective} from '../directive-interfaces/iproduct-tour.directive';
import {translate} from '../util/translate';
import {AccountSettingsService} from './account-settings.service';

/**
 * Manages product tours.
 */
@Injectable()
export class ProductTourService extends BaseProvider {
	/** @ignore */
	private instance?: IntroJs | undefined;

	/** Elements to use for tour. */
	public readonly items = new Set<IProductTourDirective>();

	/** Starts tour. */
	public async start ({
		introMessage,
		root
	}: {
		introMessage?: string;
		root?: HTMLElement | {elementRef: ElementRef<HTMLElement>};
	} = {}) : Promise<void> {
		await this.stop();

		const rootElement =
			root instanceof HTMLElement ?
				root :
				root?.elementRef?.nativeElement;

		const items = Array.from(this.items)
			.filter(
				o =>
					!!o.cyphProductTourContent &&
					o.cyphProductTourOrder > 0 &&
					!!o.elementRef.nativeElement &&
					(!rootElement ||
						rootElement.contains(o.elementRef.nativeElement))
			)
			.sort((a, b) => a.cyphProductTourOrder - b.cyphProductTourOrder);

		const steps = [
			...(introMessage ? [{intro: introMessage}] : []),
			...items.map(o => ({
				element: o.elementRef.nativeElement,
				intro: o.translate ?
					translate(o.cyphProductTourContent) :
					o.cyphProductTourContent
			}))
		];

		if (steps.length < 1) {
			return;
		}

		const instance = await introJs().setOptions({steps}).start();

		/* intro.js type declaration bug */
		this.instance = instance;

		await new Promise<void>(resolve => {
			instance.oncomplete(() => {
				resolve();
			});
			instance.onexit(() => {
				resolve();
			});
		});

		await this.accountSettingsService.updateSetupChecklist('productTour');
	}

	/** Stops ongoing tour, if applicable. */
	public async stop () : Promise<void> {
		if (!this.instance) {
			return;
		}

		await this.instance.exit(true);
	}

	constructor (
		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService
	) {
		super();
	}
}
