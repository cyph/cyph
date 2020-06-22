import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, of, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {Async} from '../../async-type';
import {BaseProvider} from '../../base-provider';
import {ISearchOptions} from '../../isearch-options';
import {MaybePromise} from '../../maybe-promise-type';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {toBehaviorSubject} from '../../util/flatten-observable';

/**
 * Angular component for search bar UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-search-bar',
	styleUrls: ['./search-bar.component.scss'],
	templateUrl: './search-bar.component.html'
})
export class SearchBarComponent<T extends any> extends BaseProvider
	implements OnChanges, OnDestroy, OnInit {
	/** @ignore */
	private querySubscription?: Subscription;

	/** @see AutofocusDirective */
	@Input() public autofocus: boolean = false;

	/** If true, will use a chip input and return multiple items in filter. */
	@Input() public chipInput: boolean = false;

	/** Search bar control. */
	@Input() public control: FormControl = new FormControl();

	/** Item(s) to display instead of list. */
	public readonly filter: BehaviorSubject<Set<T>> = new BehaviorSubject<
		Set<T>
	>(new Set());

	/** Filter change event. */
	@Output() public readonly filterChange: EventEmitter<
		BehaviorSubject<Set<T>>
	> = new EventEmitter<BehaviorSubject<Set<T>>>();

	/** First filter item. */
	public readonly filterSingle: BehaviorSubject<
		T | undefined
	> = toBehaviorSubject(
		this.filter.pipe(map(items => items.values().next().value)),
		undefined,
		this.subscriptions
	);

	/** Gets chip from filter value. */
	public readonly getChip = memoize((value?: T) => this.chipTransform(value));

	/** Emits on search bar input blur. */
	@Output() public readonly inputBlur = new EventEmitter<void>();

	/** Search bar autocomplete options list length. */
	@Input() public listLength: number = 10;

	/** Search bar autocomplete options. */
	@Input() public options?: Observable<ISearchOptions>;

	/** Placeholder string. */
	@Input() public placeholder: string = this.stringsService.search;

	/** Search bar input element. */
	@ViewChild('searchInput') public searchInput?: ElementRef;

	/** Indicates whether spinner should be displayed in search bar. */
	@Input() public spinner: Observable<boolean> = of(false);

	/** Search query. */
	@Input() public query?: Observable<string>;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue = trackByValue;

	/** @ignore */
	private clearInput () : void {
		this.control.setValue('');

		if (this.searchInput?.nativeElement) {
			this.searchInput.nativeElement.value = '';
		}
	}

	/** Transforms filter value to chip value. */
	@Input() public chipTransform: (
		value?: T
	) => {
		smallText?: Async<string | undefined>;
		text: Async<string>;
	} = value => ({text: <any> value});

	/** Clears filter. */
	public clearFilter () : void {
		this.filter.next(new Set());
		this.clearInput();
	}

	/** Transforms string value to filter value. */
	@Input() public filterTransform: (
		value?: string
	) => MaybePromise<T | undefined> = value => <any> value;

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!changes.query) {
			return;
		}

		if (this.querySubscription) {
			this.querySubscription.unsubscribe();
		}

		if (!this.query) {
			return;
		}

		this.querySubscription = this.query.subscribe(value => {
			this.control.setValue(value);
			this.pushToFilter(value);
		});
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.clearFilter();
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		super.ngOnDestroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.filterChange.emit(this.filter);
	}

	/** Pushes to filter based on search query. */
	public async pushToFilter (value?: string) : Promise<void> {
		const o = await this.filterTransform(value);

		if (this.chipInput) {
			if (o !== undefined) {
				const newFilterValue = new Set(this.filter.value);
				this.filter.next(newFilterValue.add(o));
				this.clearInput();
			}

			return;
		}

		if (o !== undefined) {
			this.filter.next(new Set([o]));
		}
		else {
			this.clearFilter();
		}
	}

	/** Removes item from filter. */
	public removeFromFilter (value: T) : void {
		if (this.chipInput) {
			const newFilterValue = new Set(this.filter.value);
			newFilterValue.delete(value);
			this.filter.next(newFilterValue);
			return;
		}

		this.clearFilter();
	}

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
