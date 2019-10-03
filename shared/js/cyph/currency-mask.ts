import {createNumberMask} from 'text-mask-addons';

/** Currency text mask. */
export const currencyMask = {mask: createNumberMask({allowDecimal: true})};
