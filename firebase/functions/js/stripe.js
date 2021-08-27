import initStripe from 'stripe';
import {stripeSecretKey} from './cyph-admin-vars.js';

export const stripe = initStripe(stripeSecretKey);
