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
