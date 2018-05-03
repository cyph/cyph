import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	Output,
	SimpleChanges
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import * as $ from 'jquery';
import * as Quill from 'quill';
import * as Delta from 'quill-delta';
import {Observable, Subscription} from 'rxjs';
import {IQuillDelta} from '../../iquill-delta';
import {IQuillRange} from '../../iquill-range';
import {LockFunction} from '../../lock-function-type';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {lockFunction} from '../../util/lock';
import {uuid} from '../../util/uuid';
import {resolvable, sleep, waitForIterable, waitForValue} from '../../util/wait';


/**
 * Angular component for Quill editor.
 */
@Component({
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: QuillComponent
		}
	],
	selector: 'cyph-quill',
	styleUrls: ['./quill.component.scss'],
	templateUrl: './quill.component.html'
})
export class QuillComponent implements AfterViewInit, ControlValueAccessor, OnChanges, OnDestroy {
	/** @ignore */
	private readonly clientID: string	= uuid();

	/** @ignore */
	private deltasSubscription?: Subscription;

	/** @ignore */
	private destroyed: boolean	= false;

	/** @ignore */
	private editablePromise?: Promise<void>;

	/** Change event callback. */
	private onChange?: (content: IQuillDelta) => void;

	/** Touch event callback. */
	private onTouched?: () => void;

	/** @ignore */
	private quill?: Quill.Quill;

	/** @ignore */
	private resolveEditablePromise?: () => void;

	/** @ignore */
	private readonly selectionLock: LockFunction	= lockFunction();

	/** @ignore */
	private selectionsSubscription?: Subscription;

	/** ID of Quill container element. */
	public readonly containerID: string	= `id-${uuid()}`;

	/** Entire contents of the editor. */
	@Input() public content?: IQuillDelta;

	/** Emits on change. */
	@Output() public readonly contentChange: EventEmitter<{
		content: IQuillDelta;
		delta: IQuillDelta;
		oldContent: IQuillDelta;
	}>	=
		new EventEmitter<{
			content: IQuillDelta;
			delta: IQuillDelta;
			oldContent: IQuillDelta;
		}>()
	;

	/** Stream of deltas to apply. */
	@Input() public deltas?: Observable<IQuillDelta>;

	/** Indicates whether editor should be read-only. */
	@Input() public isDisabled: boolean	= false;

	/** Emits on ready. */
	@Output() public readonly ready: EventEmitter<void>	= new EventEmitter<void>();

	/** Emits on selection change. */
	@Output() public readonly selectionChange: EventEmitter<{
		oldRange: IQuillRange;
		range: IQuillRange;
	}>	=
		new EventEmitter<{
			oldRange: IQuillRange;
			range: IQuillRange;
		}>()
	;

	/** Stream of selections to apply. */
	@Input() public selections?: Observable<IQuillRange>;

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

	/** @ignore */
	private addClientID<T> (t: T|undefined) : T&{clientID: string} {
		if (!t) {
			return <any> {clientID: this.clientID};
		}

		const newT		= <any> t;
		newT.clientID	= this.clientID;
		return newT;
	}

	/** @ignore */
	private setQuillContent () : void {
		if (!this.quill || this.destroyed) {
			return;
		}

		this.quill.setContents(
			this.content ?
				new Delta(this.stripExternalSubresources(this.content).ops) :
				new Delta()
		);
	}

	/** @ignore */
	private stripExternalSubresources (delta: IQuillDelta) : IQuillDelta {
		if (!delta.ops) {
			return delta;
		}

		for (const {insert} of delta.ops) {
			if (!insert) {
				continue;
			}

			for (const k of ['image', 'video']) {
				const url	= !insert[k] ? undefined : insert[k].url ? insert[k].url : insert[k];
				if (
					(typeof url !== 'string' || url.startsWith('data:')) &&
					!(typeof url === 'string' && url.startsWith('data:image/svg'))
				) {
					continue;
				}

				if (insert[k].url) {
					insert[k].url	= '';
				}
				else {
					insert[k]		= '';
				}
			}
		}

		return delta;
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep(0);

		if (this.destroyed) {
			return;
		}

		await waitForIterable(() => $(`#${this.containerID}`));

		/* Temporary workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18946 */
		this.quill	= <Quill.Quill> new (<any> Quill)(`#${this.containerID}`, {
			modules: {toolbar: this.toolbar},
			theme: 'snow'
		});

		this.quill.on('text-change', (delta, oldDelta, source) => {
			if (source !== 'user') {
				return;
			}

			const content	= this.addClientID(oldDelta.compose(delta));

			this.contentChange.emit({
				content,
				delta: this.addClientID(delta),
				oldContent: this.addClientID(oldDelta)
			});

			if (this.onChange) {
				this.onChange(content);
			}
		});

		this.quill.on('selection-change', (
			range: Quill.RangeStatic|undefined,
			oldRange: Quill.RangeStatic|undefined,
			source
		) => {
			if (source !== 'user') {
				return;
			}

			if (
				this.onTouched &&
				(!range || range.length === 0) &&
				(!oldRange || oldRange.length === 0)
			) {
				this.onTouched();
			}

			this.selectionChange.emit({
				oldRange: this.addClientID(oldRange),
				range: this.addClientID(range)
			});
		});

		await waitForIterable(() => $(`#${this.containerID} .ql-editor:not(.ql-blank)`));
		this.ready.emit();
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (this.destroyed) {
			return;
		}

		await waitForValue(() => this.quill);

		if (!this.quill) {
			throw new Error('No Quill.');
		}

		for (const k of Object.keys(changes)) {
			switch (k) {
				case 'content':
					if (this.content) {
						this.setQuillContent();
					}
					break;

				case 'deltas':
					if (this.deltasSubscription) {
						this.deltasSubscription.unsubscribe();
					}

					if (!this.deltas) {
						break;
					}

					this.deltasSubscription	= this.deltas.subscribe(delta => {
						if (!this.quill) {
							throw new Error('No Quill.');
						}
						else if (delta.clientID !== this.clientID) {
							this.quill.updateContents(
								new Delta(this.stripExternalSubresources(delta).ops)
							);
						}
					});
					break;

				case 'isDisabled':
					if (this.isDisabled) {
						const {resolve, promise}	= resolvable();
						this.editablePromise		= promise;
						this.resolveEditablePromise	= resolve;
						this.quill.disable();
					}
					else {
						if (this.resolveEditablePromise) {
							this.resolveEditablePromise();
							this.editablePromise		= undefined;
							this.resolveEditablePromise	= undefined;
						}
						this.quill.enable();
					}
					break;

				case 'selections':
					if (this.selectionsSubscription) {
						this.selectionsSubscription.unsubscribe();
					}

					if (!this.selections) {
						break;
					}

					this.selectionsSubscription	= this.selections.subscribe(range => {
						this.selectionLock(async () => {
							await this.editablePromise;

							if (!this.quill) {
								throw new Error('No Quill.');
							}
							else if (range.clientID !== this.clientID) {
								this.quill.setSelection(range.index, range.length);
							}
						});
					});
			}
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed	= true;
	}

	/** @inheritDoc */
	public registerOnChange (f: (content: IQuillDelta) => void) : void {
		this.onChange	= f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched	= f;
	}

	/** @inheritDoc */
	public setDisabledState (b: boolean) : void {
		if (this.isDisabled !== b) {
			this.isDisabled	= b;
		}
	}

	/** @inheritDoc */
	public writeValue (value: IQuillDelta) : void {
		if (this.content !== value) {
			this.content	= value;
		}

		this.setQuillContent();
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
