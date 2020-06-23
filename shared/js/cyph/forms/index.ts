/* eslint-disable max-lines */

import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../proto';

/** Convenience method for extracting a value from an IForm object. */
/* eslint-disable-next-line @typescript-eslint/unbound-method */
export const {getFormValue} = class {
	/** @ignore */
	public static getFormValue (
		form: IForm | undefined,
		value: 'boolean',
		componentIndex: number,
		containerIndex: number,
		elementIndex: number
	) : boolean | undefined;
	/** @ignore */
	public static getFormValue (
		form: IForm | undefined,
		value: 'bytes',
		componentIndex: number,
		containerIndex: number,
		elementIndex: number
	) : boolean | undefined;
	/** @ignore */
	public static getFormValue (
		form: IForm | undefined,
		value: 'number',
		componentIndex: number,
		containerIndex: number,
		elementIndex: number
	) : number | undefined;
	/** @ignore */
	public static getFormValue (
		form: IForm | undefined,
		value: 'string',
		componentIndex: number,
		containerIndex: number,
		elementIndex: number
	) : string | undefined;
	/** @ignore */
	public static getFormValue (
		form: IForm | undefined,
		value: 'boolean' | 'bytes' | 'number' | 'string',
		componentIndex: number,
		containerIndex: number,
		elementIndex: number
	) : boolean | number | string | Uint8Array | undefined {
		const component = form?.components ?
			form.components[componentIndex] :
			undefined;

		if (!component) {
			return;
		}

		const container = component.containers ?
			component.containers[containerIndex] :
			undefined;

		if (!container) {
			return;
		}

		const element = container.elements ?
			container.elements[elementIndex] :
			undefined;

		if (!element || !element.element) {
			return;
		}

		return value === 'boolean' ?
			element.element.valueBoolean :
		value === 'bytes' ?
			element.element.valueBytes :
		value === 'number' ?
			element.element.valueNumber :
		value === 'string' ?
			element.element.valueString :
			undefined;
	}
};

/** Creates a new form. */
export const newForm = (
	components: Form.IComponent[],
	id?: string,
	isExpansionPanel?: boolean
) : IForm => ({
	components,
	id,
	isExpansionPanel
});

/** Creates a new form component. */
export const newFormComponent = (
	containers: (Form.IElementContainer | Form.IElementContainer[])[],
	id?: string,
	isColumn?: boolean
) : Form.IComponent => ({
	containers: containers.flat(),
	id,
	isColumn
});

/** Creates a new form container. */
export const newFormContainer = (
	elements: (Form.IElement | Form.IElement[] | Form.IElementContainer)[],
	id?: string,
	isColumn?: boolean,
	formula?: string
) : Form.IElementContainer => ({
	elements: elements.reduce<Form.IElementOrElementContainer[]>(
		(arr, elem) =>
			arr.concat(
				'type' in elem ?
					{element: elem} :
				elem instanceof Array ?
					elem.map(element => ({element})) :
					{elementContainer: elem}
			),
		[]
	),
	formula,
	id,
	isColumn
});

/** Creates a new form element. */
export const newFormElement = <
	T extends {
		fileName?: string;
		id?: string;
		label?: string;
		mask?: any;
		max?: number;
		mediaType?: string;
		min?: number;
		noGrow?: boolean;
		options?: string[];
		required?: boolean;
		step?: number;
		tooltip?: string;
		value?: boolean | number | string | Uint8Array;
		width?: number;
	}
>(
	elementType: Form.Element.Types
) =>
	/* eslint-disable-next-line complexity */
	(o?: T) => {
		const element: Form.IElement = {
			fileName: o?.fileName,
			id: o?.id,
			label: o?.label,
			mask: o?.mask && msgpack.encode(o.mask),
			max: o?.max,
			mediaType: o?.mediaType,
			min: o?.min,
			noGrow: o && o.noGrow === true,
			options: o?.options,
			required: o?.required,
			step: o?.step,
			tooltip: o?.tooltip,
			type: elementType,
			width: o?.width
		};

		if (o && typeof o.value === 'boolean') {
			element.valueBoolean = o.value;
		}
		else if (o && o.value instanceof Uint8Array) {
			element.valueBytes = o.value;
		}
		else if (o && typeof o.value === 'number') {
			element.valueNumber = o.value;
		}
		else if (o && typeof o.value === 'string') {
			element.valueString = o.value;
		}

		return element;
	};

/** Creates a new checkbox form element. */
export const checkbox = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.Element.Types.Checkbox);

/** Creates a new datepicker form element. */
export const datepicker = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Datepicker);

/** Creates a new email input form element. */
export const emailInput = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Email);

/** Creates a new file input form element. */
export const fileInput = newFormElement<{
	fileName?: string;
	id?: string;
	label?: string;
	mediaType?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: Uint8Array;
	width?: number;
}>(Form.Element.Types.File);

/** Creates a new text input form element. */
export const input = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Input);

/** Creates a new number input form element. */
export const numberInput = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	noGrow?: boolean;
	required?: boolean;
	step?: number;
	value?: number;
	width?: number;
}>(Form.Element.Types.Number);

/** Creates a new password input form element. */
export const passwordInput = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Password);

/** Creates a new radio button group form element. */
export const radio = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Radio);

/** Creates a new select dropdown form element. */
export const select = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Select);

/** Creates a new slider form element. */
export const slider = newFormElement<{
	id?: string;
	label?: string;
	max?: number;
	min?: number;
	noGrow?: boolean;
	step?: number;
	value?: number;
	width?: number;
}>(Form.Element.Types.Slider);

/** Creates a new slide toggle button form element. */
export const slideToggle = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	tooltip?: string;
	value?: boolean;
	width?: number;
}>(Form.Element.Types.SlideToggle);

/** Creates a new text form element. */
export const text = newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Text);

/** Creates a new textbox form element. */
export const textarea = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Textarea);

/** Creates a new time input form element. */
export const timeInput = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	noGrow?: boolean;
	required?: boolean;
	step?: number;
	value?: string;
	width?: number;
}>(Form.Element.Types.Time);

/** Creates a new URL input form element. */
export const urlInput = newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.URL);

/** Form title element row. */
export const title = (titleText: string) : Form.IElementContainer => {
	return newFormContainer([text({label: titleText, width: 100})]);
};

/** Phone number element row. */
export const phone = (id: string = 'PhoneNumber.Home') : Form.IElement => {
	return input({
		id,
		label: 'Phone Number',
		mask: {
			mask: [
				'(',
				/[1-9]/,
				/\d/,
				/\d/,
				')',
				' ',
				/\d/,
				/\d/,
				/\d/,
				'-',
				/\d/,
				/\d/,
				/\d/,
				/\d/
			],
			showMask: true
		},
		width: 20
	});
};

/** Email address element row. */
export const email = (
	id: string = 'EmailAddresses[0]',
	data?: Record<string, string>
) : Form.IElement =>
	emailInput({id, label: 'Email', required: true, value: data?.email});

/** Name element row. */
export const name = (
	id?: string,
	data?: Record<string, string>
) : Form.IElementContainer => {
	const nameSplit = data?.name ? data.name.split(' ') : [];

	return newFormContainer(
		[
			input({
				id: 'FirstName',
				label: 'First Name',
				required: true,
				value: nameSplit[0]
			}),
			input({id: 'MiddleName', label: 'Middle Name'}),
			input({
				id: 'LastName',
				label: 'Last Name',
				required: true,
				value: nameSplit[1]
			})
		],
		id
	);
};

/** Address element row. */
export const address = (id: string = 'Address') : Form.IElementContainer => {
	return newFormContainer(
		[
			input({id: 'StreetAddress', label: 'Address'}),
			input({id: 'City', label: 'City'}),
			input({id: 'State', label: 'State', width: 10}),
			input({id: 'ZIP', label: 'Zip', width: 25})
		],
		id,
		false
	);
};

/** Street address element row. */
export const streetAddress = (
	id: string = 'StreetAddress'
) : Form.IElementContainer => {
	return newFormContainer(
		[input({id: 'StreetAddress', label: 'Address', width: 50})],
		id,
		false
	);
};

/** Address details element row. */
export const addressDetails = (
	id: string = 'AddressDetails'
) : Form.IElementContainer => {
	return newFormContainer(
		[
			input({id: 'City', label: 'City', width: 15}),
			input({id: 'State', label: 'State', width: 10}),
			input({id: 'ZIP', label: 'Zip', width: 25})
		],
		id,
		false
	);
};

/** SSN element row. */
export const ssn = (id: string = 'SSN') : Form.IElement => {
	return input({
		id,
		label: 'Social Security Number',
		mask: {
			mask: [
				/\d/,
				/\d/,
				/\d/,
				'-',
				/\d/,
				/\d/,
				'-',
				/\d/,
				/\d/,
				/\d/,
				/\d/
			],
			placeholderChar: '#',
			showMask: true
		},
		width: 20
	});
};

/** Contact information component. */
export const contact = (
	id?: string,
	data?: Record<string, string>
) : Form.IComponent => {
	return newFormComponent(
		[
			name(undefined, data),
			newFormContainer([email(undefined, data), phone(), ssn()]),
			address()
		],
		id,
		false
	);
};

/** Contact information components. */
export const contactSplit = (id?: string) : Form.IComponent[] => {
	return [
		newFormComponent([name()], id),
		newFormComponent([newFormContainer([email(), phone(), ssn()])], id),
		newFormComponent(
			[
				newFormContainer(
					[input({id: 'StreetAddress', label: 'Address'})],
					'Address'
				)
			],
			id
		),
		newFormComponent(
			[
				newFormContainer(
					[
						input({id: 'City', label: 'City'}),
						input({id: 'State', label: 'State', width: 10}),
						input({id: 'ZIP', label: 'Zip', width: 25})
					],
					'Address'
				)
			],
			id
		)
	];
};

/** Height. */
export const height = (id: string = 'height') : Form.IElementContainer =>
	newFormContainer(
		[
			numberInput({
				label: 'Height: ft',
				max: 11,
				min: 0,
				width: 10
			}),
			numberInput({
				label: 'Height: in',
				max: 11,
				min: 0,
				width: 10
			})
		],
		id,
		false,
		/* ${val}/12-((${val}/12)Mod1)) is a workaround pending mexp support for floor(${val}/12) */
		/* eslint-disable-next-line no-template-curly-in-string */
		'calc(${0}*12+${1})\n[calc(${val}/12-((${val}/12)Mod1)), calc(${val}Mod12)]'
	);

/** Basic patient info for telehealth patients. */
export const basicInfo = (id?: string) : Form.IComponent => {
	return newFormComponent(
		[
			newFormContainer([
				datepicker({
					id: 'DOB',
					label: 'Date of Birth',
					required: true,
					width: 20
				}),
				select({
					id: 'Sex',
					label: 'Sex',
					options: ['Male', 'Female'],
					required: true
				}),
				select({
					id: 'MaritalStatus',
					label: 'Marital Status',
					options: ['Single', 'Married']
				}),
				numberInput({
					label: 'Weight (lbs)',
					max: 1500,
					required: false,
					width: 15
				}),
				height()
			])
		],
		id
	);
};

/** Insurance information element row. */
export const insurance = (id?: string) : Form.IElementContainer => {
	return newFormContainer(
		[
			input({label: "Insured's name"}),
			input({label: 'Relationship'}),
			input({label: 'Employer'}),
			phone()
		],
		id
	);
};

/** Insurance information component. */
export const insuranceComponent = (id?: string) : Form.IComponent => {
	return newFormComponent(
		[
			title('Primary Insurance'),
			insurance(),
			address(),
			newFormContainer([input({label: 'Insurance Company'})]),
			title('Secondary Insurance'),
			insurance(),
			address(),
			newFormContainer([input({label: 'Insurance Company'})])
		],
		id
	);
};

/** Opt in or out of Cyph as preferred contact method & mailing list. */
export const optInOut = () : Form.IComponent =>
	newFormComponent([
		newFormContainer([
			checkbox({
				label: 'Use Cyph as preferred contact method',
				noGrow: true,
				value: true
			}),
			checkbox({
				label: 'Opt-In to receive updates & tips from Cyph',
				noGrow: true
			})
		])
	]);

/** New patient form. */
export const newPatient = (data?: Record<string, string>) : IForm =>
	newForm(
		[
			newFormComponent([title('Basic Information')]),
			contact('redoxPatient.Demographics', data),
			basicInfo('redoxPatient.Demographics'),
			insuranceComponent(),
			optInOut()
		],
		'patient'
	);

/** Private patient profile form. */
export const patientProfilePrivate = () : IForm[] => [
	newForm(
		[
			newFormComponent([title('Basic Info')]),
			...contactSplit('redoxPatient.Demographics'),
			newFormComponent([
				newFormContainer([
					datepicker({
						id: 'DOB',
						label: 'Date of Birth'
					}),
					select({
						id: 'Sex',
						label: 'Sex',
						options: ['Male', 'Female']
					}),
					select({
						id: 'MaritalStatus',
						label: 'Marital Status',
						options: ['Single', 'Married']
					})
				])
			]),
			newFormComponent([
				newFormContainer([
					numberInput({
						label: 'Weight (lbs)',
						max: 1500
					}),
					height()
				])
			])
		],
		undefined,
		true
	)
];

/** Patient profile form. */
export const patientProfile = () : IForm[] => [
	newForm([newFormComponent([title('Patient Profile')])], undefined, true)
];

/** Doctor profile form. */
export const doctorProfile = (data?: Record<string, string>) : IForm[] => [
	newForm(
		[
			newFormComponent([title('Education & Training')]),
			newFormComponent([
				newFormContainer([
					input({
						label: "Bachelor's",
						value: data?.bachelors
					})
				])
			]),
			newFormComponent([
				newFormContainer([
					input({
						label: 'Medical School',
						value: data?.medSchool
					})
				])
			]),
			newFormComponent([
				newFormContainer([
					input({
						label: 'Residency',
						value: data?.residency
					})
				])
			])
		],
		undefined,
		true
	),
	newForm(
		[
			newFormComponent([title('Misc')]),
			newFormComponent([
				newFormContainer([
					input({
						label: 'NPI',
						value: data?.npi
					})
				])
			])
		],
		undefined,
		true
	)
];

/** Telehealth organization profile form. */
export const telehealthOrgProfile = () : IForm[] => [
	newForm([newFormComponent([title('Org Profile')])], undefined, true)
];

/** Telehealth staff profile form. */
export const telehealthStaffProfile = () : IForm[] => [
	newForm([newFormComponent([title('Staff Profile')])], undefined, true)
];
