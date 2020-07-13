import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	Output,
	SimpleChanges
} from '@angular/core';
import {Sidenav} from 'materialize-css';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for sidenav UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-sidenav',
	styleUrls: ['./sidenav.component.scss'],
	templateUrl: './sidenav.component.html'
})
export class SidenavComponent extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy {
	/** @ignore */
	private sidenav?: Sidenav;

	/** Open/close event. */
	@Output() public readonly openChange = new EventEmitter<boolean>();

	/** Open state. */
	@Input() public opened: boolean = false;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (
			!(
				this.elementRef.nativeElement instanceof HTMLElement &&
				this.elementRef.nativeElement.firstElementChild instanceof
					HTMLElement
			)
		) {
			return;
		}

		this.sidenav = Sidenav.init(
			this.elementRef.nativeElement.firstElementChild,
			{
				onCloseEnd: () => {
					this.opened = false;
					this.openChange.emit(false);
				},
				onOpenEnd: () => {
					this.opened = true;
					this.openChange.emit(true);
				}
			}
		);
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!changes.opened || !this.sidenav) {
			return;
		}

		if (this.opened && !this.sidenav.isOpen) {
			this.sidenav.open();
		}
		else if (!this.opened && this.sidenav.isOpen) {
			this.sidenav.close();
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		if (!this.sidenav) {
			return;
		}

		this.sidenav.destroy();

		this.sidenav = undefined;
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
