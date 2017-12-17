import {Component, EventEmitter, Input, Output} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../proto';
import {StringsService} from '../services/strings.service';
import {trackByIndex} from '../track-by/track-by-index';
import {trackBySelf} from '../track-by/track-by-self';
import {getOrSetDefault} from '../util/get-or-set-default';


/**
 * Angular component for dynamic form.
 */
@Component({
	selector: 'cyph-dynamic-form',
	styleUrls: ['../../../css/components/dynamic-form.scss'],
	templateUrl: '../../../templates/dynamic-form.html'
})
export class DynamicFormComponent {
	/** @ignore */
	private readonly maskCache: Map<Uint8Array, any>	= new Map<Uint8Array, any>();

	/** @see Form */
	@Input() public form: IForm;

	/** @see Form */
	@Output() public submit: EventEmitter<IForm>		= new EventEmitter<IForm>();

	/** @see trackByIndex */
	public readonly trackByIndex: typeof trackByIndex	= trackByIndex;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf		= trackBySelf;

	/** @see Form.FormElement.Types */
	public readonly types: typeof Form.Element.Types	= Form.Element.Types;

	/** Decode mask bytes. */
	public getMask ({mask}: Form.IElement) : any {
		if (!mask || mask.length < 1) {
			return;
		}

		return getOrSetDefault(
			this.maskCache,
			mask,
			() => msgpack.decode(mask)
		);
	}

	/** Converts a timestamp into a Date. */
	public timestampToDate (timestamp: number) : Date {
		return new Date(timestamp);
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
