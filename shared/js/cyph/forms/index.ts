/* tslint:disable:max-file-line-count */

import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../proto';


const newForm			= (
	components: Form.IComponent[],
	id?: string,
	isExpansionPanel?: boolean
) : IForm => ({
	components,
	id,
	isExpansionPanel
});

const newFormComponent	= (
	containers: (Form.IElementContainer|Form.IElementContainer[])[],
	id?: string,
	isColumn?: boolean
) : Form.IComponent => ({
	containers: containers.reduce<Form.IElementContainer[]>((a, b) => a.concat(b), []),
	id,
	isColumn
});

const newFormContainer		= (
	elements: (Form.IElement|Form.IElement[]|Form.IElementContainer)[],
	id?: string,
	isColumn?: boolean,
	formula?: string
) : Form.IElementContainer => ({
	elements: elements.reduce<Form.IElementOrElementContainer[]>(
		(arr, elem) => arr.concat(
			'type' in elem ?
				{element: elem} :
			elem instanceof Array ?
				elem.map(element => ({element})) :
				{elementContainer: elem}),
		[]
	),
	formula,
	id,
	isColumn
});


const newFormElement	= <T extends {
	id?: string;
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	noGrow?: boolean;
	options?: string[];
	required?: boolean;
	value?: boolean|number|string;
	width?: number;
}> (elementType: Form.Element.Types) => (o?: T) => {
	const element: Form.IElement	= {
		id: o && o.id,
		label: o && o.label,
		mask: o && o.mask && msgpack.encode(o.mask),
		max: o && o.max,
		min: o && o.min,
		noGrow: o && o.noGrow === true,
		options: o && o.options,
		required: o && o.required,
		type: elementType,
		width: o && o.width
	};

	if (o && typeof o.value === 'boolean') {
		element.valueBoolean	= o.value;
	}
	else if (o && typeof o.value === 'number') {
		element.valueNumber		= o.value;
	}
	else if (o && typeof o.value === 'string') {
		element.valueString		= o.value;
	}

	return element;
};

/** Creates a new checkbox form element. */
export const checkbox		= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.Element.Types.Checkbox);

/** Creates a new datepicker form element. */
export const datepicker		= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Datepicker);

/** Creates a new email input form element. */
export const emailInput		= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Email);

/** Creates a new text input form element. */
export const input			= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Input);

/** Creates a new number input form element. */
export const numberInput	= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	noGrow?: boolean;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Number);

/** Creates a new password input form element. */
export const passwordInput	= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Password);

/** Creates a new radio button group form element. */
export const radio			= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Radio);

/** Creates a new select dropdown form element. */
export const select			= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Select);

/** Creates a new slider form element. */
export const slider			= newFormElement<{
	id?: string;
	label?: string;
	max?: number;
	min?: number;
	noGrow?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Slider);

/** Creates a new slide toggle button form element. */
export const slideToggle	= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.Element.Types.SlideToggle);

/** Creates a new text form element. */
export const text			= newFormElement<{
	id?: string;
	label?: string;
	noGrow?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Text);

/** Creates a new textbox form element. */
export const textarea		= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Textarea);

/** Creates a new time input form element. */
export const timeInput		= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Time);

/** Creates a new URL input form element. */
export const urlInput		= newFormElement<{
	id?: string;
	label?: string;
	mask?: any;
	noGrow?: boolean;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.URL);

/** Form title element row. */
export const title		= (titleText: string) : Form.IElementContainer => {
	return newFormContainer([text({label: titleText, width: 100})]);
};

/** Phone number element row. */
export const phone		= (id: string = 'PhoneNumber.Home') : Form.IElement => {
	return input({
		id,
		label: 'Phone Number',
		mask: {
			mask: [
				'(', /[1-9]/, /\d/, /\d/, ')', ' ',
				/\d/, /\d/, /\d/, '-',
				/\d/, /\d/, /\d/, /\d/
			],
			showMask: true
		},
		width: 20
	});
};

/** Email address element row. */
export const email		= (id: string = 'EmailAddresses[0]') : Form.IElement => {
	return emailInput({id, label: 'Email', required: true});
};

/** Name element row. */
export const name		= (id?: string) : Form.IElementContainer => {
	return newFormContainer(
		[
			input({id: 'FirstName', label: 'First Name', required: true}),
			input({id: 'MiddleName', label: 'Middle Name'}),
			input({id: 'LastName', label: 'Last Name', required: true})
		],
		id
	);
};

/** Address element row. */
export const address	= (id: string = 'Address') : Form.IElementContainer => {
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
export const streetAddress	= (id: string = 'StreetAddress') : Form.IElementContainer => {
	return newFormContainer(
		[
			input({id: 'StreetAddress', label: 'Address', width: 50})
		],
		id,
		false
	);
};

/** Address details element row. */
export const addressDetails	= (id: string = 'AddressDetails') : Form.IElementContainer => {
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
export const ssn		= (id: string = 'SSN') : Form.IElement => {
	return input({
		id,
		label: 'Social Security Number',
		mask: {
			mask: [
				/\d/, /\d/, /\d/, '-',
				/\d/, /\d/, '-',
				/\d/, /\d/, /\d/, /\d/
			],
			placeholderChar: '#',
			showMask: true
		},
		width: 20
	});
};

/** Contact information component. */
export const contact			= (id?: string) : Form.IComponent => {
	return newFormComponent(
		[
			name(),
			newFormContainer([
				email(),
				phone(),
				ssn()
			]),
			address()
		],
		id,
		false
	);
};

/** Contact information components. */
export const contactSplit		= (id?: string) : Form.IComponent[] => {
	return [
		newFormComponent(
			[name()],
			id
		),
		newFormComponent(
			[newFormContainer([
				email(),
				phone(),
				ssn()
			])],
			id
		),
		newFormComponent(
			[newFormContainer(
				[
					input({id: 'StreetAddress', label: 'Address'})
				],
				'Address'
			)],
			id
		),
		newFormComponent(
			[newFormContainer(
				[
					input({id: 'City', label: 'City'}),
					input({id: 'State', label: 'State', width: 10}),
					input({id: 'ZIP', label: 'Zip', width: 25})
				],
				'Address'
			)],
			id
		)
	];
};

/** Height. */
export const height		= (id: string = 'height') : Form.IElementContainer => newFormContainer(
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
	/* tslint:disable-next-line:no-invalid-template-strings */
	'calc(${0}*12+${1})\n[calc(${val}/12-((${val}/12)Mod1)), calc(${val}Mod12)]'
);

/** Basic patient info for telehealth patients. */
export const basicInfo			= (id?: string) : Form.IComponent => {
	return newFormComponent(
		[
			newFormContainer([
				datepicker({id: 'DOB', label: 'Date of Birth', width: 20, required: true}),
				select({id: 'Sex', label: 'Sex', options: ['Male', 'Female'], required: true}),
				select({
					id: 'MaritalStatus',
					label: 'Marital Status',
					options: ['Single', 'Married']
				}),
				numberInput({label: 'Weight (lbs)', max: 1500, width: 15, required: false}),
				height()
			])
		],
		id
	);
};

/** Insurance information element row. */
export const insurance			= (id?: string) : Form.IElementContainer => {
	return newFormContainer(
		[
			input({label: "Insured's name"}),
			input({label: 'Relationship'}),
			input({label: 'Employer'}),
			input({label: 'Phone Number'})
		],
		id
	);
};

/** Insurance information component. */
export const insuranceComponent	= (id?: string) : Form.IComponent => {
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
export const optInOut			= () : Form.IComponent => newFormComponent([
	newFormContainer([
		checkbox({label: 'Use Cyph as preferred contact method', noGrow: true, value: true}),
		checkbox({label: 'Opt-In to receive updates & tips from Cyph', noGrow: true})
	])
]);

/** New patient form. */
export const newPatient			= () : IForm => newForm(
	[
		newFormComponent([title('Basic Information')]),
		contact('redoxPatient.Demographics'),
		basicInfo('redoxPatient.Demographics'),
		insuranceComponent(),
		optInOut()
	],
	'patient'
);

/** Patient profile form. */
export const patientProfile		= () : IForm[] => [
	newForm(
		[
			newFormComponent([title('Basic Info')]),
			...contactSplit('redoxPatient.Demographics'),
			newFormComponent([newFormContainer([
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
			])]),
			newFormComponent([newFormContainer([
				numberInput({
					label: 'Weight (lbs)',
					max: 1500
				}),
				height()
			])])
		],
		undefined,
		true
	)
];

/** Doctor profile form. */
export const doctorProfile				= () : IForm[] => [
	newForm(
		[
			newFormComponent([title('Education & Training')]),
			newFormComponent([newFormContainer([input({label: "Bachelor's"})])]),
			newFormComponent([newFormContainer([input({label: 'Medical School'})])]),
			newFormComponent([newFormContainer([input({label: 'Residency'})])])
		],
		undefined,
		true
	),
	newForm(
		[
			newFormComponent([title('Misc')]),
			newFormComponent([newFormContainer([input({label: 'NPI'})])])
		],
		undefined,
		true
	)
];

/** Telehealth organization profile form. */
export const telehealthOrgProfile		= () : IForm[] => [
	newForm(
		[
			newFormComponent([title('Org Profile')])
		],
		undefined,
		true
	)
];

/** Telehealth staff profile form. */
export const telehealthStaffProfile		= () : IForm[] => [
	newForm(
		[
			newFormComponent([title('Staff Profile')])
		],
		undefined,
		true
	)
];
