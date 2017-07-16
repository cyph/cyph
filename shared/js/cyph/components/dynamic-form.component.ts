import {Component, EventEmitter, Input, Output} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../../proto';
import {util} from '../util';


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
	private readonly maskCache: Map<Uint8Array, any>		= new Map<Uint8Array, any>();

	/** @see Form */
	@Input() public form: IForm;

	/** @see Form */
	@Output() public submit: EventEmitter<IForm>			= new EventEmitter<IForm>();

	/** @see Form.FormElement.Types */
	public readonly types: typeof Form.FormElement.Types	= Form.FormElement.Types;

	/** Decode mask bytes. */
	public getMask ({mask}: Form.IFormElement) : any {
		if (!mask) {
			return;
		}

		return util.getOrSetDefault(
			this.maskCache,
			mask,
			() => msgpack.decode(mask)
		);
	}

	constructor () {}
}
