import {Cryptocurrencies, Currencies} from '../proto';


/** Contaniner for either a Cryptocurrencies or Currencies value. */
export type GenericCurrency	= {
	cryptocurrency: Cryptocurrencies;
	currency?: undefined;
}|{
	cryptocurrency?: undefined;
	currency: Currencies;
};
