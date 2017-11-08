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
import * as Delta from 'quill-delta';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {IQuillDelta} from '../iquill-delta';
import {IQuillRange} from '../iquill-range';
import {LockFunction} from '../lock-function-type';
import {EnvService} from '../services/env.service';
import {lockFunction} from '../util/lock';
import {uuid} from '../util/uuid';
import {sleep, waitForValue} from '../util/wait';


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
	private clientID: string	= uuid();

	/** @ignore */
	private deltasSubscription?: Subscription;

	/** @ignore */
	private editablePromise?: Promise<void>;

	/** @ignore */
	private quill?: Quill.Quill;

	/** @ignore */
	private resolveEditablePromise?: () => void;

	/** @ignore */
	private readonly selectionLock: LockFunction	= lockFunction();

	/** @ignore */
	private selectionsSubscription?: Subscription;

	/** Emits on change. */
	@Output() public readonly change: EventEmitter<{
		content: IQuillDelta;
		delta: IQuillDelta;
		oldContents: IQuillDelta;
	}>	=
		new EventEmitter<{
			content: IQuillDelta;
			delta: IQuillDelta;
			oldContents: IQuillDelta;
		}>()
	;

	/** ID of Quill container element. */
	public readonly containerID: string	= `id-${uuid()}`;

	/** Entire contents of the editor. */
	@Input() public content?: IQuillDelta;

	/** Stream of deltas to apply. */
	@Input() public deltas?: Observable<IQuillDelta>;

	/** Indicates whether editor should be read-only. */
	@Input() public readOnly: boolean;

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
	@Input() public selections: Observable<IQuillRange>;

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
	private addClientID<T> (t: T) : T&{clientID: string} {
		if (!t) {
			return t;
		}

		const newT		= <any> t;
		newT.clientID	= this.clientID;
		return newT;
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
				if (typeof url !== 'string' || url.startsWith('data:')) {
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

		/* Temporary workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18946 */
		this.quill	= <Quill.Quill> new (<any> Quill)(`#${this.containerID}`, {
			modules: {toolbar: this.toolbar},
			theme: 'snow'
		});

		this.quill.on('text-change', (delta, oldDelta, source) => {
			if (source !== 'user') {
				return;
			}

			this.change.emit({
				content: this.addClientID(oldDelta.compose(delta)),
				delta: this.addClientID(delta),
				oldContents: this.addClientID(oldDelta)
			});
		});

		this.quill.on('selection-change', (range, oldRange, source) => {
			if (source !== 'user') {
				return;
			}

			this.selectionChange.emit({
				oldRange: this.addClientID(oldRange),
				range: this.addClientID(range)
			});
		});
	}

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		await waitForValue(() => this.quill);

		if (!this.quill) {
			throw new Error('No Quill.');
		}

		for (const k of Object.keys(changes)) {
			switch (k) {
				case 'content':
					if (this.content) {
						this.quill.setContents(
							new Delta(this.stripExternalSubresources(this.content).ops)
						);
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

				case 'readOnly':
					if (this.readOnly) {
						this.editablePromise	= new Promise(resolve => {
							this.resolveEditablePromise	= resolve;
						});
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

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
