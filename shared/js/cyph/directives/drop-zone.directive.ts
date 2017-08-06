import {Directive, ElementRef, EventEmitter, OnInit, Output, Renderer2} from '@angular/core';
import * as Dropzone from 'dropzone';
import {util} from '../util';


/** File drop zone. */
@Directive({
	selector: '[cyphDropZone]'
})
export class DropZoneDirective implements OnInit {
	/** File drop event emitter. */
	@Output() public fileDrop: EventEmitter<File>	= new EventEmitter<File>();

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const id	= `id-${util.uuid()}`;

		this.renderer.addClass(this.elementRef.nativeElement, id);
		new Dropzone(`.${id}`, {accept: (file) => { this.fileDrop.emit(file); }});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {}
}
