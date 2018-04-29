import {Component, EventEmitter, Inject, Input, OnInit, Optional, Output} from '@angular/core';
import memoize from 'lodash-es/memoize';
import * as msgpack from 'msgpack-lite';
import {IAsyncValue} from '../../iasync-value';
import {MaybePromise} from '../../maybe-promise-type';
import {Form, IForm, PatientInfo} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex} from '../../track-by/track-by-index';
import {trackBySelf} from '../../track-by/track-by-self';
import {getOrSetDefault} from '../../util/get-or-set-default';
import {timestampToDate} from '../../util/time';
import {uuid} from '../../util/uuid';


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
	private readonly maskDefaultKey: Uint8Array				= new Uint8Array(0);

	/** @ignore */
	private readonly maskCache: Map<Uint8Array, any>		= new Map<Uint8Array, any>();

	/** Data source to pull data from on init and save data to on submit. */
	@Input() public dataSource?: MaybePromise<IAsyncValue<any>|undefined>	=
		(this.accountDatabaseService && this.envService.isTelehealth) ?
			this.accountDatabaseService.getCurrentUser().then(() =>
				this.accountDatabaseService ?
					this.accountDatabaseService.getAsyncValue('patientInfo', PatientInfo) :
					undefined
			) :
			undefined
	;

	/** @see Form */
	@Input() public form?: IForm;

	/** Gets a random unique name for the specified Form item. */
	public readonly getName	= memoize((_O: IForm|Form.IComponent|Form.IElement|Form.IElementRow) =>
		uuid()
	);

	/** Indicates whether input is disabled. */
	@Input() public isDisabled: boolean							= false;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile: boolean								= this.envService.isMobile;

	/** @see Form */
	@Output() public readonly submitForm: EventEmitter<IForm>	= new EventEmitter<IForm>();

	/** @see timestampToDate */
	public readonly timestampToDate: typeof timestampToDate		= timestampToDate;

	/** @see trackByIndex */
	public readonly trackByIndex: typeof trackByIndex			= trackByIndex;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf				= trackBySelf;

	/** @see Form.FormElement.Types */
	public readonly types: typeof Form.Element.Types			= Form.Element.Types;

	private async getDataSource () : Promise<IAsyncValue<any>|undefined> {
		return this.dataSource instanceof Promise ?
			this.dataSource.catch(() => undefined) :
			this.dataSource
		;
	}

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
							const arrayIndex	= (s.match(/\[\d+\]$/) || [])[0];
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
		const maskBytes	= !mask || mask.length < 1 ? this.maskDefaultKey : mask;

		return getOrSetDefault(
			this.maskCache,
			maskBytes,
			() => maskBytes !== this.maskDefaultKey ?
				msgpack.decode(maskBytes) :
				{mask: false}
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		const dataSource	= await this.getDataSource();

		if (this.isDisabled || !dataSource || !this.form || !this.form.components) {
			return;
		}

		const value	= await dataSource.getValue();

		this.iterateFormValues((id, segments, element) => {
			const elementValue	= segments.reduce(
				(v, segment) =>
					(
						(typeof segment === 'number' && v instanceof Array) ||
						(typeof segment === 'string' && typeof v === 'object')
					) ?
						v[segment] :
						undefined
				,
				value
			);

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
		const dataSource	= await this.getDataSource();

		if (dataSource) {
			await dataSource.updateValue(value => {
				this.iterateFormValues((id, segments, element) => {
					const elementValue	=
						element.valueBoolean !== undefined ?
							element.valueBoolean :
							element.valueNumber !== undefined ?
								element.valueNumber :
								element.valueString
					;

					const lastSegment	= segments.length > 0 ? segments.slice(-1)[0] : undefined;

					if (elementValue === undefined || lastSegment === undefined) {
						return;
					}

					let parentValue	= value;

					for (let i = 0 ; i < segments.length - 1 ; ++i) {
						const segment		= segments[i];
						const nextSegment	= segments[i + 1];
						const nextValue		= parentValue[segment];

						if (typeof nextSegment === 'number' && !(nextValue instanceof Array)) {
							parentValue[segment]	= [];
						}
						else if (
							typeof nextSegment === 'string' &&
							typeof nextValue !== 'object'
						) {
							parentValue[segment]	= {};
						}

						parentValue	= parentValue[segment];
					}

					parentValue[lastSegment]	= elementValue;
				});

				return value;
			});
		}

		this.submitForm.emit(this.form);
	}

	/** @see Number.parseInt */
	public parseInt (s: string) : number|undefined {
		return s ? Number.parseInt(s, 10) : undefined;
	}

	constructor (
		/** @ignore */
		@Inject(AccountDatabaseService) @Optional()
		private readonly accountDatabaseService: AccountDatabaseService|undefined,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
