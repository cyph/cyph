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

	/** @ignore */
	private init () : void {
		if (this.dropZone) {
			this.dropZone.destroy();
		}

		if (this.cyphDropZone === false) {
			this.renderer.removeClass(this.elementRef.nativeElement, this.className);
			return;
		}

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

		this.dropZone	= dropZone;
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		this.init();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.renderer.addClass(this.elementRef.nativeElement, this.id);
		this.init();
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
