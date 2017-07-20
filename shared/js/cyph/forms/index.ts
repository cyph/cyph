import * as msgpack from 'msgpack-lite';
import {Form, IForm} from '../../proto';


const newForm			= (...components: Form.IComponent[]) : IForm => ({
	components
});

const newFormComponent	= (...rows: (
	Form.IElementRow|Form.IElementRow[])[]) : Form.IComponent => ({
	rows: rows.reduce<Form.IElementRow[]>((a, b) => a.concat(b), [])
});

const newFormRow		= (...elements: (
	Form.IElement|Form.IElement[])[]) : Form.IElementRow => ({
	elements: elements.reduce<Form.IElement[]>((a, b) => a.concat(b), [])
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
}> (elementType: Form.Element.Types) => (o?: T) => {
	const element: Form.IElement	= {
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
}>(Form.Element.Types.Checkbox);

/** Creates a new datepicker form element. */
export const datepicker		= newFormElement<{
	label?: string;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Datepicker);

/** Creates a new text input form element. */
export const input			= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Input);

/** Creates a new number input form element. */
export const numberInput	= newFormElement<{
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	required?: boolean;
	value?: number;
	width?: number;
}>(Form.Element.Types.Number);

/** Creates a new password input form element. */
export const passwordInput	= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Password);

/** Creates a new radio button group form element. */
export const radio			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Radio);

/** Creates a new select dropdown form element. */
export const select			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Select);

/** Creates a new slider form element. */
export const slider			= newFormElement<{
	label?: string;
	max?: number;
	min?: number;
	value?: number;
	width?: number;
}>(Form.Element.Types.Slider);

/** Creates a new slide toggle button form element. */
export const slideToggle	= newFormElement<{
	label?: string;
	required?: boolean;
	value?: boolean;
	width?: number;
}>(Form.Element.Types.SlideToggle);

/** Creates a new text form element. */
export const text			= newFormElement<{
	label?: string;
	value?: string;
	width?: number;
}>(Form.Element.Types.Text);

/** Creates a new textbox form element. */
export const textarea		= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
	width?: number;
}>(Form.Element.Types.Textarea);

/** Form title element row. */
export const title		= (titleText: string) : Form.IElementRow => {
	return newFormRow(text({label: titleText, width: 100}));
};

/** Phone number element row. */
export const phone		= () : Form.IElementRow => {
	return newFormRow([input({label: 'Phone Number'})]);
};

/** Email address element row. */
export const email		= () : Form.IElementRow => {
	return newFormRow([input({label: 'Email', required: true})]);
};

/** Name element row. */
export const name		= () : Form.IElementRow => {
	return newFormRow([
		input({label: 'First Name', required: true}),
		input({label: 'Middle Name'}),
		input({label: 'Last Name', required: true})
	]);
};

/** Address element row. */
export const address	= () : Form.IElementRow => {
		return newFormRow([
		input({label: 'Address'}),
		input({label: 'City'}),
		input({label: 'State', width: 10}),
		input({label: 'Zip', width: 25})
	]);
};

/** SSN element row. */
export const ssn		= () : Form.IElementRow => {
	return newFormRow([passwordInput({label: 'Social Security Number', width: 20})]);
};

/** Contact information component. */
export const contact			= () : Form.IComponent => {
	return newFormComponent([
		title('Contact Information'),
		name(),
		email(),
		phone()
	]);
};

/** Insurance information element row. */
export const insurance			= () : Form.IElementRow => {
	return newFormRow([
		input({label: "Insured's name"}),
		input({label: 'Relationship'}),
		input({label: 'Employer'}),
		input({label: 'Phone Number'})
	]);
};

/** Insurance information component. */
export const insuranceComponent	= () : Form.IComponent => {
	return newFormComponent([
		title('Primary Insurance'),
		insurance(),
		address(),
		newFormRow(input({label: 'Insurance Company'})),
		title('Secondary Insurance'),
		insurance(),
		address(),
		newFormRow(input({label: 'Insurance Company'}))
	]);
};

/** New patient form. */
export const newPatient			= () : IForm => newForm(
	newFormComponent(title('New Patient Form')),
	contact(),
	insuranceComponent()
);
