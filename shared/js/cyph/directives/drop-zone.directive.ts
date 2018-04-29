import {Directive, ElementRef, EventEmitter, OnInit, Output, Renderer2} from '@angular/core';
import * as Dropzone from 'dropzone';
import {uuid} from '../util/uuid';


/** File drop zone. */
@Directive({
	selector: '[cyphDropZone]'
})
export class DropZoneDirective implements OnInit {
	/** File drop event emitter. */
	@Output() public readonly fileDrop: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
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
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
