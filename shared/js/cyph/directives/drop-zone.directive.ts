import {
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output,
	Renderer2
} from '@angular/core';
import * as Dropzone from 'dropzone';
import {uuid} from '../util/uuid';


/** File drop zone. */
@Directive({
	selector: '[cyphDropZone]'
})
export class DropZoneDirective implements OnChanges, OnInit {
	/** @ignore */
	private readonly className: string	= 'cyph-drop-zone';

	/** @ignore */
	private dropZone?: Dropzone;

	/** Indicates whether directive should be active. */
	@Input() public cyphDropZone?: boolean;

	/** File drop event emitter. */
	@Output() public readonly fileDrop: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.dropZone) {
			return;
		}

		if (this.cyphDropZone === false) {
			this.dropZone.disable();
			this.renderer.removeClass(this.elementRef.nativeElement, this.className);
		}
		else {
			this.dropZone.enable();
			this.renderer.addClass(this.elementRef.nativeElement, this.className);
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		const id	= `id-${uuid()}`;

		this.renderer.addClass(this.elementRef.nativeElement, id);

		const dropZone	= new Dropzone(`.${id}`, {
			accept: (file, done) => {
				done('ignore');
				dropZone.removeAllFiles();
				this.fileDrop.emit(file);
			},
			url: 'data:text/plain;ascii,'
		});

		if (this.cyphDropZone === false) {
			dropZone.disable();
		}
		else {
			this.renderer.addClass(this.elementRef.nativeElement, this.className);
		}

		this.dropZone	= dropZone;
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
