import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../../proto';


const newForm				= (...components: Form.IFormComponent[]) : IForm => ({
	components
});

const newFormRow			= (...elements: (
	Form.IFormElement|Form.IFormElement[])[]) : Form.IFormElementRow => ({
	elements: elements.reduce<Form.IFormElement[]>((a, b) => a.concat(b), [])
});

const newFormComponent			= (...rows: (
	Form.IFormElementRow|Form.IFormElementRow[])[]) : Form.IFormComponent => ({
	rows: rows.reduce<Form.IFormElementRow[]>((a, b) => a.concat(b), [])
});


const newFormElement	= <T extends {
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	options?: string[];
	required?: boolean;
	value?: boolean|number|string;
	width?: number;
}> (elementType: Form.FormElement.Types) => (o?: T) => {
	const element: Form.IFormElement	= {
		label: o && o.label,
		mask: o && o.mask && msgpack.encode(o.mask),
		max: o && o.max,
		min: o && o.min,
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
	label?: string;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.FormElement.Types.Checkbox);

/** Creates a new datepicker form element. */
export const datepicker		= newFormElement<{
	label?: string;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.FormElement.Types.Datepicker);

/** Creates a new text input form element. */
export const input			= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Input);

/** Creates a new number input form element. */
export const numberInput	= newFormElement<{
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.FormElement.Types.Number);

/** Creates a new password input form element. */
export const passwordInput	= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Password);

/** Creates a new radio button group form element. */
export const radio			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Radio);

/** Creates a new select dropdown form element. */
export const select			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Select);

/** Creates a new slider form element. */
export const slider			= newFormElement<{
	label?: string;
	max?: number;
	min?: number;
	value?: number;
	width?: number;
}>(Form.FormElement.Types.Slider);

/** Creates a new slide toggle button form element. */
export const slideToggle	= newFormElement<{
	label?: string;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.FormElement.Types.SlideToggle);

/** Creates a new text form element. */
export const text			= newFormElement<{
	label?: string;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Text);

/** Creates a new textbox form element. */
export const textarea		= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.FormElement.Types.Textarea);

export const title		= (titleText: string) : Form.IFormElementRow => {
	return newFormRow(text({label: titleText, width: 100}));
};

export const phone				= () : Form.IFormElementRow => {
	return newFormRow([input({label: 'Phone Number'})]);
};

export const email				= () : Form.IFormElementRow => {
	return newFormRow([input({label: 'Email', required: true})]);
};

export const name		= () : Form.IFormElementRow => {
	return newFormRow([
		input({label: 'First Name', required: true}),
		input({label: 'Middle Name'}),
		input({label: 'Last Name', required: true})
	]);
};

export const address	= () : Form.IFormElementRow => {
		return newFormRow([
		input({label: 'Address'}),
		input({label: 'City'}),
		input({label: 'State', width: 10}),
		input({label: 'Zip', width: 25})
	]);
};

export const ssn	= () : Form.IFormElementRow => {
	return newFormRow([passwordInput({label: 'Social Security Number', width: 20})]);
};

export const contact			= () : Form.IFormComponent => {
	return newFormComponent([
		title('Contact Information'),
		name(),
		email(),
		phone()
	]);
};

export const insurance				= () : Form.IFormElementRow => {
	return newFormRow([
		input({label: 'Insured\'s name'}),
		input({label: 'Relationship'}),
		input({label: 'Employer'}),
		input({label: 'Phone Number'})
	]);
};

export const insuranceComponent	= () : Form.IFormComponent => {
	return newFormComponent([
		title('Primary Insurance'),
		insurance(),
		address(),
		<Form.IFormElementRow> input({label: 'Insurance Company'}),
		title('Secondary Insurance'),
		insurance(),
		address(),
		<Form.IFormElementRow> input({label: 'Insurance Company'})
	]);
};

export const newPatient		= () : IForm => newForm(
	<Form.IFormComponent> title('New Patient Form'),
	contact(),
	insuranceComponent()
);
