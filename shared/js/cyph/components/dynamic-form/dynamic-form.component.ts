import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {IAsyncValue} from '../../iasync-value';
import {Form, IForm} from '../../proto';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex} from '../../track-by/track-by-index';
import {trackBySelf} from '../../track-by/track-by-self';
import {getOrSetDefault} from '../../util/get-or-set-default';
import {timestampToDate} from '../../util/time';


/**
 * Angular component for dynamic form.
 */
@Component({
	selector: 'cyph-dynamic-form',
	styleUrls: ['./dynamic-form.component.scss'],
	templateUrl: './dynamic-form.component.html'
})
export class DynamicFormComponent implements OnInit {
	/** @ignore */
	private readonly maskCache: Map<Uint8Array, any>		= new Map<Uint8Array, any>();

	/** @ignore */
	private readonly segmentReducer							= (v: any, segment: number|string) =>
		(
			(typeof segment === 'number' && v instanceof Array) ||
			(typeof segment === 'string' && typeof v === 'object')
		) ?
			v[segment] :
			undefined
	;

	/** @see Form */
	@Input() public form?: IForm;

	/** Data source to pull data from on init and save data to on submit. */
	@Input() public dataSource?: IAsyncValue<any>;

	/** Indicates whether input is disabled. */
	@Input() public isDisabled: boolean						= false;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean							= this.envService.isMobile;

	/** @see Form */
	@Output() public submitForm: EventEmitter<IForm>		= new EventEmitter<IForm>();

	/** @see timestampToDate */
	public readonly timestampToDate: typeof timestampToDate	= timestampToDate;

	/** @see trackByIndex */
	public readonly trackByIndex: typeof trackByIndex		= trackByIndex;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf			= trackBySelf;

	/** @see Form.FormElement.Types */
	public readonly types: typeof Form.Element.Types		= Form.Element.Types;

	/** @ignore */
	private iterateFormValues (
		f: (id: string, segments: (number|string)[], element: Form.IElement) => void
	) : void {
		if (!this.form || !this.form.components) {
			return;
		}

		for (const component of this.form.components) {
			if (!component.rows) {
				continue;
			}

			for (const row of component.rows) {
				if (!row.elements) {
					continue;
				}

				for (const element of row.elements) {
					if (!element.id) {
						continue;
					}

					const id	=
						(component.id ? `${component.id}.` : '') +
						(row.id ? `${row.id}.` : '') +
						element.id
					;

					const segments	= id.split('.').
						map(s => {
							const arrayIndex = (s.match(/\[\d+\]$/) || [])[0];
							return !arrayIndex ? s : [
								s.slice(0, 0 - arrayIndex.length),
								Number.parseInt(arrayIndex.slice(1, -1), 10)
							];
						}).reduce(
							(arr: (number|string)[], s) => arr.concat(s),
							[]
						)
					;

					f(id, segments, element);
				}
			}
		}
	}

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

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.dataSource || !this.form || !this.form.components) {
			return;
		}

		const value	= await this.dataSource.getValue();

		this.iterateFormValues((id, segments, element) => {
			const elementValue	= segments.reduce(this.segmentReducer, value);

			if (elementValue === undefined) {
				return;
			}

			switch (typeof elementValue) {
				case 'boolean':
					element.valueBoolean	= elementValue;
					break;

				case 'number':
					element.valueNumber		= elementValue;
					break;

				case 'string':
					element.valueString		= elementValue;
					break;

				default:
					throw new Error(`Invalid form value at ${id}`);
			}
		});
	}

	/** Submit handler. */
	public async onSubmit () : Promise<void> {
		if (this.dataSource) {
			await this.dataSource.updateValue(value => {
				this.iterateFormValues((id, segments, element) => {
					const elementValue	=
						element.valueBoolean === undefined ?
							element.valueBoolean :
							element.valueNumber === undefined ?
								element.valueNumber :
								element.valueString
					;

					const lastSegment	= segments.slice(-1)[0];

					if (elementValue === undefined || lastSegment === undefined) {
						return;
					}

					const parentValue	= segments.slice(0, -1).reduce(this.segmentReducer, value);

					if (parentValue === undefined) {
						return;
					}

					parentValue[lastSegment]	= elementValue;
				});

				return value;
			});
		}

		this.submitForm.emit(this.form);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
