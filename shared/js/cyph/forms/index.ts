import * as msgpack from 'msgpack-lite';
import {Form} from '../../proto';


const newFormElement	= <T extends {
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	options?: string[];
	required?: boolean;
	value?: boolean|number|string;
}> (elementType: Form.FormElement.Types) => (o?: T) => {
	const element: Form.IFormElement	= {
		label: o && o.label,
		mask: o && o.mask && msgpack.encode(o.mask),
		max: o && o.max,
		min: o && o.min,
		options: o && o.options,
		required: o && o.required,
		type: elementType
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
}>(Form.FormElement.Types.Checkbox);

/** Creates a new datepicker form element. */
export const datepicker		= newFormElement<{
	label?: string;
	required?: boolean;
	value?: number;
}>(Form.FormElement.Types.Datepicker);

/** Creates a new text input form element. */
export const input			= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
}>(Form.FormElement.Types.Input);

/** Creates a new line break form element. */
export const lineBreak		= newFormElement<never>(Form.FormElement.Types.LineBreak);

/** Creates a new number input form element. */
export const numberInput	= newFormElement<{
	label?: string;
	mask?: any;
	max?: number;
	min?: number;
	required?: boolean;
	value?: number;
}>(Form.FormElement.Types.Number);

/** Creates a new password input form element. */
export const passwordInput	= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
}>(Form.FormElement.Types.Password);

/** Creates a new radio button group form element. */
export const radio			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
}>(Form.FormElement.Types.Radio);

/** Creates a new select dropdown form element. */
export const select			= newFormElement<{
	label?: string;
	options?: string[];
	required?: boolean;
	value?: string;
}>(Form.FormElement.Types.Select);

/** Creates a new slider form element. */
export const slider			= newFormElement<{
	label?: string;
	max?: number;
	min?: number;
	value?: number;
}>(Form.FormElement.Types.Slider);

/** Creates a new slide toggle button form element. */
export const slideToggle	= newFormElement<{
	label?: string;
	required?: boolean;
	value?: boolean;
}>(Form.FormElement.Types.SlideToggle);

/** Creates a new text form element. */
export const text			= newFormElement<{
	label?: string;
	value?: string;
}>(Form.FormElement.Types.Text);

/** Creates a new textbox form element. */
export const textarea		= newFormElement<{
	label?: string;
	mask?: any;
	required?: boolean;
	value?: string;
}>(Form.FormElement.Types.Textarea);
