import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Inject,
	Input,
	OnInit,
	Optional,
	Output,
	Type,
	ViewContainerRef
} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IContactListItem, User} from '../../account';
import {BaseProvider} from '../../base-provider';
import {IResolvable} from '../../iresolvable';

/**
 * Angular component for account contacts search UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-contacts-search-optional',
	styleUrls: ['./account-contacts-search-optional.component.scss'],
	templateUrl: './account-contacts-search-optional.component.html'
})
export class AccountContactsSearchOptionalComponent
	extends BaseProvider
	implements OnInit
{
	/** @see AccountContactsSearchComponent.autofocus */
	@Input() public autofocus?: boolean;

	/** @see AccountContactsSearchComponent.chipInput */
	@Input() public chipInput?: boolean;

	/** @see AccountContactsSearchComponent.contactList */
	@Input() public contactList?:
		| Observable<(IContactListItem | User)[]>
		| undefined;

	/** @see AccountContactsSearchComponent.externalUsers */
	@Input() public externalUsers?: boolean;

	/** @see AccountContactsSearchComponent.getContacts */
	@Input() public getContacts?: IResolvable<User[]>;

	/** @see AccountContactsSearchComponent.includeGroups */
	@Input() public includeGroups?: boolean;

	/** @see AccountContactsSearchComponent.minimum */
	@Input() public minimum?: number;

	/** @see AccountContactsSearchComponent.name */
	@Input() public name?: string;

	/** @see AccountContactsSearchComponent.placeholder */
	@Input() public placeholder?: string;

	/** @see AccountContactsSearchComponent.readonly */
	@Input() public readonly?: boolean;

	/** @see AccountContactsSearchComponent.required */
	@Input() public required?: boolean;

	/** @see AccountContactsSearchComponent.searchBarBlur */
	@Output() public readonly searchBarBlur = new EventEmitter<void>();

	/** @see AccountContactsSearchComponent.searchListLength */
	@Input() public searchListLength?: number;

	/** @see AccountContactsSearchComponent.searchProfileExtra */
	@Input() public searchProfileExtra?: boolean;

	/** @see AccountContactsSearchComponent.searchUsername */
	@Input() public searchUsername?: Observable<string> | string;

	/** @see AccountContactsSearchComponent.title */
	@Input() public title?: string;

	/** @see AccountContactsSearchComponent.userFilterChange */
	@Output() public readonly userFilterChange: EventEmitter<
		BehaviorSubject<Set<User>>
	> = new EventEmitter<BehaviorSubject<Set<User>>>();

	/** @inheritDoc */
	public ngOnInit () : void {
		if (!this.accountContactsSearchComponent) {
			return;
		}

		this.viewContainerRef.clear();

		const {instance} =
			this.viewContainerRef.createComponent<AccountContactsSearchOptionalComponent>(
				this.accountContactsSearchComponent
			);

		if (this.autofocus !== undefined) {
			instance.autofocus = this.autofocus;
		}
		if (this.chipInput !== undefined) {
			instance.chipInput = this.chipInput;
		}
		if (this.contactList !== undefined) {
			instance.contactList = this.contactList;
		}
		if (this.externalUsers !== undefined) {
			instance.externalUsers = this.externalUsers;
		}
		if (this.getContacts !== undefined) {
			instance.getContacts = this.getContacts;
		}
		if (this.includeGroups !== undefined) {
			instance.includeGroups = this.includeGroups;
		}
		if (this.minimum !== undefined) {
			instance.minimum = this.minimum;
		}
		if (this.name !== undefined) {
			instance.name = this.name;
		}
		if (this.placeholder !== undefined) {
			instance.placeholder = this.placeholder;
		}
		if (this.readonly !== undefined) {
			instance.readonly = this.readonly;
		}
		if (this.required !== undefined) {
			instance.required = this.required;
		}
		if (this.searchListLength !== undefined) {
			instance.searchListLength = this.searchListLength;
		}
		if (this.searchProfileExtra !== undefined) {
			instance.searchProfileExtra = this.searchProfileExtra;
		}
		if (this.searchUsername !== undefined) {
			instance.searchUsername = this.searchUsername;
		}
		if (this.title !== undefined) {
			instance.title = this.title;
		}

		this.subscriptions.push(
			instance.searchBarBlur.subscribe(this.searchBarBlur)
		);
		this.subscriptions.push(
			instance.userFilterChange.subscribe(this.userFilterChange)
		);
	}

	constructor (
		/** @ignore */
		private readonly viewContainerRef: ViewContainerRef,

		/** @ignore */
		@Inject('AccountContactsSearchComponent')
		@Optional()
		private readonly accountContactsSearchComponent:
			| Type<AccountContactsSearchOptionalComponent>
			| undefined
	) {
		super();
	}
}
