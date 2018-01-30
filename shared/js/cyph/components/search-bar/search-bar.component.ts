import {
	Component,
	Input,
	OnChanges,
	SimpleChanges
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {Subscription} from 'rxjs/Subscription';
import {ISearchOptions} from '../../isearch-options';
import {StringsService} from '../../services/strings.service';
import {trackByValue} from '../../track-by/track-by-value';


/**
 * Angular component for search bar UI.
 */
@Component({
	selector: 'cyph-search-bar',
	styleUrls: ['./search-bar.component.scss'],
	templateUrl: './search-bar.component.html'
})
export class SearchBarComponent implements OnChanges {
	/** @ignore */
	private querySubscription?: Subscription;

	/** Search bar control. */
	@Input() public control: FormControl					= new FormControl();

	/** @see SearchBarComponent.filterTransform */
	@Input() public filterTransform: (value: any) => any	= value => value;

	/** Search bar autocomplete options list length. */
	@Input() public listLength: number						= 10;

	/** Search bar autocomplete options. */
	@Input() public options?: Observable<ISearchOptions>;

	/** Placeholder string. */
	@Input() public placeholder: string						= this.stringsService.search;

	/** Indicates whether spinner should be displayed in search bar. */
	@Input() public spinner: Observable<boolean>			= of(false);

	/** Search query. */
	@Input() public query?: Observable<string>;

	/** Single item to display instead of list. */
	public readonly filter: BehaviorSubject<any|undefined>	= new BehaviorSubject(undefined);

	/** @see trackByValue */
	public readonly trackByValue: typeof trackByValue		= trackByValue;

	/** Clears filter. */
	public clearFilter () : void {
		this.filter.next(undefined);
		this.control.setValue('');
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!changes.query) {
			return;
		}

		if (this.querySubscription) {
			this.querySubscription.unsubscribe();
		}

		if (this.query) {
			this.querySubscription	= this.query.subscribe(value => {
				this.control.setValue(value);
				this.setFilter(value);
			});
		}
	}

	/** Sets filter based on search query. */
	public async setFilter (value?: any) : Promise<void> {
		this.filter.next(await this.filterTransform(value));
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
