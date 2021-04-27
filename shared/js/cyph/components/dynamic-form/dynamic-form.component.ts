import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Inject,
	Input,
	OnInit,
	Optional,
	Output
} from '@angular/core';
import memoize from 'lodash-es/memoize';
import * as mexp from 'math-expression-evaluator';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {emailPattern} from '../../email-pattern';
import {IAsyncValue} from '../../iasync-value';
import {MaybePromise} from '../../maybe-promise-type';
import {Form, IForm, PatientInfo} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex} from '../../track-by/track-by-index';
import {trackBySelf} from '../../track-by/track-by-self';
import {filterUndefined} from '../../util/filter/base';
import {toFloat, toInt} from '../../util/formatting';
import {getOrSetDefault} from '../../util/get-or-set-default';
import {saveFile} from '../../util/save-file';
import {dynamicDeserialize, parse} from '../../util/serialization';
import {timestampToDate} from '../../util/time';
import {uuid} from '../../util/uuid';

/**
 * Angular component for dynamic form.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dynamic-form',
	styleUrls: ['./dynamic-form.component.scss'],
	templateUrl: './dynamic-form.component.html'
})
export class DynamicFormComponent extends BaseProvider implements OnInit {
	/** @ignore */
	private readonly maskDefaultKey: Uint8Array = new Uint8Array(0);

	/** @ignore */
	private readonly maskCache: Map<Uint8Array, any> = new Map();

	/** @ignore */
	private readonly processCalcs = memoize((formula: string) : string => {
		return formula.replace(/calc\([^\s]+\)/g, s => {
			let calcEnd = Array.from(s)
				.slice(5)
				.concat(' ')
				.reduce(
					(o: {left: number; right: number} | number, c, i) =>
						typeof o === 'number' ?
							o :
						o.left === o.right ?
							i :
							{
								left: o.left + (c === '(' ? 1 : 0),
								right: o.right + (c === ')' ? 1 : 0)
							},
					{left: 1, right: 0}
				);

			if (typeof calcEnd === 'number') {
				calcEnd += 5;
			}
			else {
				calcEnd = s.length;
			}

			let result = 0;
			try {
				result = mexp.eval(s.slice(5, calcEnd - 1));
			}
			catch {}

			return result.toString() + s.slice(calcEnd);
		});
	});

	/** Emits when form changes. */
	@Output() public readonly changeForm = new EventEmitter<void>();

	/** Data source to pull data from on init and save data to on submit. */
	@Input() public dataSource?: MaybePromise<IAsyncValue<any> | undefined> =
		this.envService.isAccounts &&
		this.accountDatabaseService &&
		this.envService.isTelehealth &&
		this.accountDatabaseService.currentUser.value ?
			this.accountDatabaseService.getAsyncValue(
				'patientInfo',
				PatientInfo
			) :
			undefined;

	/** @see emailPattern */
	public readonly emailPattern = emailPattern;

	/** @see Form */
	@Input() public form?: IForm;

	/** Gets a random unique name for the specified Form item. */
	public readonly getName = memoize(
		(
			_O: IForm | Form.IComponent | Form.IElement | Form.IElementContainer
		) => uuid()
	);

	/** Hides all elements with empty values when isDisabled is true. */
	@Input() public hideEmptyElements: boolean = false;

	/** Returns a password visibility toggle for the given field. */
	public readonly hidePassword = memoize(
		(_O: Form.IElement) => new BehaviorSubject<boolean>(true)
	);

	/** Hides submit button. */
	@Input() public hideSubmitButton: boolean = false;

	/** Indicates whether input is disabled/read-only. */
	@Input() public isDisabled: boolean = false;

	/** Indicates whether mobile version should be displayed. */
	@Input() public mobile?: boolean;

	/** @see saveFile */
	public readonly saveFile = saveFile;

	/** @see Form */
	@Output() public readonly submitForm = new EventEmitter<IForm>();

	/** Submit button text. */
	@Input() public submitText: string = this.stringsService.submit;

	/** @see timestampToDate */
	public readonly timestampToDate = timestampToDate;

	/** @see toFloat */
	public readonly toFloat = toFloat;

	/** @see trackByIndex */
	public readonly trackByIndex = trackByIndex;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see Form.FormElement.Types */
	public readonly types = Form.Element.Types;

	/** @ignore */
	private async getDataSource () : Promise<IAsyncValue<any> | undefined> {
		return this.dataSource instanceof Promise ?
			this.dataSource.catch(() => undefined) :
			this.dataSource;
	}

	/** @ignore */
	private getElementValue (
		element: Form.IElement
	) : boolean | number | string | Uint8Array | undefined {
		return element.valueBoolean !== undefined ?
			element.valueBoolean :
		element.valueNumber !== undefined ?
			element.valueNumber :
		element.valueString !== undefined ?
			element.valueString :
			element.valueBytes;
	}

	/** @ignore */
	private iterateFormValues (
		f: (
			hasOwnID: boolean,
			id: string,
			segments: (number | string)[],
			element: Form.IElement | undefined,
			elementValue: boolean | number | string | Uint8Array | undefined,
			getElementValue:
				| ((val: string) => (boolean | number | string | Uint8Array)[])
				| undefined
		) => void
	) : void {
		if (!this.form || !this.form.components) {
			return;
		}

		for (const component of this.form.components) {
			if (!component.containers) {
				continue;
			}

			const getContainers = (
				containers: Form.IElementContainer[]
			) : Form.IElementContainer[] =>
				containers.length < 1 ?
					containers :
					containers.concat(
						getContainers(
							containers.flatMap(o =>
								filterUndefined(
									(o.elements || []).map(
										elem => elem.elementContainer
									)
								)
							)
						)
					);

			for (const container of getContainers(component.containers)) {
				const containerElements = filterUndefined(
					(container.elements || []).map(elem => elem.element)
				);

				if (containerElements.length < 1) {
					continue;
				}

				const containerID = !container.id ?
					undefined :
					(component.id ? `${component.id}.` : '') + container.id;

				const containerFormula =
					containerID && container.formula ?
						container.formula :
						undefined;

				const containerValue = !containerFormula ?
					undefined :
					this.processCalcs(
						containerElements
							.map(element => this.getElementValue(element))
							.reduce(
								(s: string, elementValue, i) =>
									s.replace(
										new RegExp(`\\\$\\{${i}\\}`, 'g'),
										(elementValue || '').toString()
									),
								containerFormula.split('\n')[0]
							)
					);

				const reverseContainerFormula = memoize((val: string) => {
					const arr = !containerFormula ?
						undefined :
						parse<any>(
							this.processCalcs(
								containerFormula
									.split('\n')[1]
									.replace(/\$\{val\}/g, val)
							)
						);

					return arr instanceof Array &&
						arr.reduce(
							(b, o) =>
								b &&
								(typeof o === 'boolean' ||
									typeof o === 'number' ||
									typeof o === 'string'),
							true
						) ?
						arr :
						[];
				});

				const elements = [
					...containerElements.map(element => ({
						element,
						elementValue: this.getElementValue(element),
						hasOwnID: !!element.id,
						id: !element.id ?
							containerID :
							(component.id ? `${component.id}.` : '') +
							(container.id ? `${container.id}.` : '') +
							element.id
					})),
					...(!containerFormula ?
						[] :
						[
							{
								element: undefined,
								elementValue: containerValue,
								hasOwnID: true,
								id: containerID
							}
						])
				];

				for (let i = 0; i < elements.length; ++i) {
					const {element, elementValue, hasOwnID, id} = elements[i];

					if (!id) {
						continue;
					}

					const segments = id.split('.').flatMap(s => {
						const arrayIndex = (s.match(/\[\d+\]$/) || [])[0];
						return !arrayIndex ?
							s :
							[
								s.slice(0, 0 - arrayIndex.length),
								toInt(arrayIndex.slice(1, -1))
							];
					});

					f(
						hasOwnID,
						id,
						segments,
						element,
						elementValue,
						!(containerFormula && element) ?
							undefined :
							val => reverseContainerFormula(val)[i]
					);
				}
			}
		}
	}

	/** Decode mask bytes. */
	public getMask ({mask}: Form.IElement) : any {
		const maskBytes = !mask || mask.length < 1 ? this.maskDefaultKey : mask;

		return getOrSetDefault(this.maskCache, maskBytes, () =>
			maskBytes !== this.maskDefaultKey ?
				dynamicDeserialize(maskBytes) :
				{mask: false}
		);
	}

	/** Indicates whether element should be displayed. */
	public isVisible (element: Form.IElement) : boolean {
		return !!(
			!this.hideEmptyElements ||
			!this.isDisabled ||
			element.valueBoolean ||
			(element.valueBytes && element.valueBytes.length > 0) ||
			element.valueNumber ||
			element.valueString
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		const dataSource = await this.getDataSource();

		if (
			this.isDisabled ||
			!dataSource ||
			!this.form ||
			!this.form.components
		) {
			return;
		}

		const value = await dataSource.getValue();

		this.iterateFormValues(
			(_, id, segments, element, _ELEMENT_VALUE, getElementValue) => {
				if (element === undefined) {
					return;
				}

				let elementValue = segments.reduce(
					(v, segment) =>
						(typeof segment === 'number' && v instanceof Array) ||
						(typeof segment === 'string' && typeof v === 'object') ?
							v[segment] :
							undefined,
					value
				);

				if (elementValue !== undefined && getElementValue) {
					elementValue = getElementValue(elementValue.toString());
				}

				if (elementValue === undefined) {
					return;
				}

				switch (typeof elementValue) {
					case 'boolean':
						element.valueBoolean = elementValue;
						break;

					case 'number':
						element.valueNumber = elementValue;
						break;

					case 'string':
						element.valueString = elementValue;
						break;

					default:
						throw new Error(`Invalid form value at ${id}`);
				}
			}
		);
	}

	/** Submit handler. */
	public async onSubmit () : Promise<void> {
		const dataSource = await this.getDataSource();

		if (dataSource) {
			await dataSource.updateValue(value => {
				this.iterateFormValues(
					(hasOwnID, _ID, segments, _, elementValue) => {
						if (!hasOwnID) {
							return;
						}

						const lastSegment =
							segments.length > 0 ?
								segments.slice(-1)[0] :
								undefined;

						if (
							elementValue === undefined ||
							lastSegment === undefined
						) {
							return;
						}

						let parentValue = value;

						for (let i = 0; i < segments.length - 1; ++i) {
							const segment = segments[i];
							const nextSegment = segments[i + 1];
							const nextValue = parentValue[segment];

							if (
								typeof nextSegment === 'number' &&
								!(nextValue instanceof Array)
							) {
								parentValue[segment] = [];
							}
							else if (
								typeof nextSegment === 'string' &&
								typeof nextValue !== 'object'
							) {
								parentValue[segment] = {};
							}

							parentValue = parentValue[segment];
						}

						parentValue[lastSegment] = elementValue;
					}
				);

				return value;
			});
		}

		this.submitForm.emit(this.form);
	}

	constructor (
		/** @ignore */
		@Inject(AccountDatabaseService)
		@Optional()
		private readonly accountDatabaseService:
			| AccountDatabaseService
			| undefined,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
