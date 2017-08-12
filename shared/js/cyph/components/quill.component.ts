import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges
} from '@angular/core';
import * as Quill from 'quill';
import {Observable, Subscription} from 'rxjs';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for Quill editor.
 */
@Component({
	selector: 'cyph-quill',
	styleUrls: ['../../../css/components/quill.scss'],
	templateUrl: '../../../templates/quill.html'
})
export class QuillComponent implements AfterViewInit, OnChanges {
	/** @ignore */
	private deltasSubscription?: Subscription;

	/** @ignore */
	private quill?: Quill.Quill;

	/** @ignore */
	private selectionsSubscription?: Subscription;

	/** ID of Quill container element. */
	public readonly containerID: string	= `id-${util.uuid()}`;

	/** Entire contents of the editor. */
	@Input() public content: Quill.DeltaStatic;

	/** Stream of deltas to apply. */
	@Input() public deltas: Observable<Quill.DeltaStatic>;

	/** Emits on change. */
	@Output() public onChange: EventEmitter<{
		content: Quill.DeltaStatic;
		delta: Quill.DeltaStatic;
		oldContents: Quill.DeltaStatic;
	}>	=
		new EventEmitter<{
			content: Quill.DeltaStatic;
			delta: Quill.DeltaStatic;
			oldContents: Quill.DeltaStatic;
		}>()
	;

	/** Emits on selection change. */
	@Output() public onSelectionChange: EventEmitter<{
		oldRange: Quill.RangeStatic;
		range: Quill.RangeStatic;
	}>	=
		new EventEmitter<{
			oldRange: Quill.RangeStatic;
			range: Quill.RangeStatic;
		}>()
	;

	/** Indicates whether editor should be read-only. */
	@Input() public readOnly: boolean;

	/** Stream of selections to apply. */
	@Input() public selections: Observable<Quill.RangeStatic>;

	/** Toolbar configuration. */
	@Input() public toolbar: any	= [
		[{size: []}],
		['bold', 'italic', 'underline', 'strike'],
		[{color: []}, {background: []}],
		['link', 'image'],
		[{align: ''}, {align: 'center'}, {align: 'right'}, {align: 'justify'}],
		[{list: 'ordered'}, {list: 'bullet'}],
		[{indent: '-1'}, {indent: '+1'}],
		['blockquote', 'code-block'],
		['clean']
	];

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		this.quill	= new Quill(`#${this.containerID}`, {
			modules: {
				toolbar: this.toolbar
			},
			theme: 'snow'
		});

		this.quill.on('text-change', (delta, oldDelta, source) => {
			if (source !== 'user') {
				return;
			}

			this.onChange.emit({
				content: oldDelta.compose(delta),
				delta,
				oldContents: oldDelta
			});
		});

		this.quill.on('selection-change', (range, oldRange, source) => {
			if (source !== 'user') {
				return;
			}

			this.onSelectionChange.emit({oldRange, range});
		});
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		await util.waitForValue(() => this.quill);

		if (!this.quill) {
			throw new Error('No Quill.');
		}

		for (const k of Object.keys(changes)) {
			switch (k) {
				case 'content':
					this.quill.setContents(this.content);
					break;

				case 'deltas':
					if (this.deltasSubscription) {
						this.deltasSubscription.unsubscribe();
					}

					this.deltasSubscription	= this.deltas.subscribe(delta => {
						if (!this.quill) {
							throw new Error('No Quill.');
						}

						this.quill.updateContents(delta);
					});
					break;

				case 'readOnly':
					if (this.readOnly) {
						this.quill.disable();
					}
					else {
						this.quill.enable();
					}
					break;

				case 'selections':
					if (this.selectionsSubscription) {
						this.selectionsSubscription.unsubscribe();
					}

					this.selectionsSubscription	= this.selections.subscribe(({index, length}) => {
						if (this.readOnly) {
							return;
						}

						if (!this.quill) {
							throw new Error('No Quill.');
						}

						this.quill.setSelection(index, length);
					});
			}
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
