import {
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output,
	SimpleChanges
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BehaviorSubject, Observable, of, Subscription} from 'rxjs';
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
export class SearchBarComponent<T extends any> implements OnChanges, OnInit {
	/** @ignore */
	private querySubscription?: Subscription;

	/** Search bar control. */
	@Input() public control: FormControl					= new FormControl();

	/** Single item to display instead of list. */
	public readonly filter: BehaviorSubject<T|undefined>	=
		new BehaviorSubject<T|undefined>(undefined)
	;

	/** Filter change event. */
	@Output() public readonly filterChange: EventEmitter<BehaviorSubject<T|undefined>>	=
		new EventEmitter<BehaviorSubject<T|undefined>>()
	;

	/** @see SearchBarComponent.filterTransform */
	@Input() public filterTransform: (value?: string) => T	= value => <any> value;

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

	/** @inheritDoc */
	public ngOnInit () : void {
		this.filterChange.emit(this.filter);
	}

	/** Sets filter based on search query. */
	public async setFilter (value?: string) : Promise<void> {
		this.filter.next(await this.filterTransform(value));
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
