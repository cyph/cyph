import {
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	Renderer2
} from '@angular/core';
import * as Dropzone from 'dropzone';
import {uuid} from '../util/uuid';
import {waitUntilTrue} from '../util/wait';


/** File drop zone. */
@Directive({
	selector: '[cyphDropZone]'
})
export class DropZoneDirective implements OnChanges {
	/** @ignore */
	private readonly className: string	= 'cyph-drop-zone';

	/** @ignore */
	private dropZone?: Promise<Dropzone>;

	/** @ignore */
	private readonly id: string	= `id-${uuid()}`;

	/** Optional file type restriction. */
	@Input() public accept?: string;

	/** Indicates whether directive should be active. */
	@Input() public cyphDropZone?: boolean;

	/** Indicates whether cyph-drop-zone class should be added. */
	@Input() public cyphDropZoneClass: boolean	= true;

	/** File drop event emitter. */
	@Output() public readonly fileDrop: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		this.renderer.addClass(this.elementRef.nativeElement, this.id);

		if (this.dropZone) {
			(await this.dropZone).destroy();
			this.dropZone	= undefined;
		}

		if (this.cyphDropZone === false) {
			this.renderer.removeClass(this.elementRef.nativeElement, this.className);
			return;
		}

		if (!this.elementRef.nativeElement) {
			return;
		}

		this.dropZone	= waitUntilTrue(() =>
			document.body.contains(this.elementRef.nativeElement)
		).then(() => {
			const dropZone	= new Dropzone(`.${this.id}`, {
				accept: (file, done) => {
					done('ignore');
					dropZone.removeAllFiles();
					this.fileDrop.emit(file);
				},
				acceptedFiles: this.accept,
				url: 'data:text/plain;ascii,'
			});

			if (this.cyphDropZoneClass) {
				this.renderer.addClass(this.elementRef.nativeElement, this.className);
			}

			return dropZone;
		});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
