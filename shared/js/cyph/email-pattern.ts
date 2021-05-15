/** @see https://emailregex.com */
export const emailRegex =
	/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/** Email regex for HTML pattern validation. */
export const emailPattern = emailRegex.toString().slice(1, -1);

/** Check if string matches email regex. */
export const isValidEmail = (email?: string) =>
	!!email && (email.match(emailRegex) || [])[0] === email;
