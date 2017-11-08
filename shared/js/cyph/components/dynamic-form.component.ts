import {Component, EventEmitter, Input, Output} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../../proto';
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

	constructor () {}
}
