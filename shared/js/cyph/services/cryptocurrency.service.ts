import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {Observable, timer} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {getExchangeRates, Transaction, Wallet as SimpleBTCWallet} from 'simplebtc';
import {GenericCurrency} from '../generic-currency-type';
import {Cryptocurrencies, Currencies, IWallet} from '../proto';


/**
 * Angular service for cryptocurrency.
 * Supported cryptocurrencies: BTC.
 */
@Injectable()
export class CryptocurrencyService {
	/** @ignore */
	private readonly watchBalanceInternal	=
		memoize((wallet: IWallet) =>
			memoize((convert?: GenericCurrency) =>
				memoize((publicBalanceOnly?: boolean) =>
					this.watchTransactionHistory(wallet).pipe(mergeMap(async () =>
						this.getBalance(wallet, convert, publicBalanceOnly)
					))
				)
			)
		)
	;

	/** Gets address of a wallet. */
	public readonly getAddress	= memoize(async (wallet: IWallet) : Promise<string> => {
		if (wallet.cryptocurrency !== Cryptocurrencies.BTC) {
			throw new Error('Unsupported cryptocurrency.');
		}

		return this.getSimpleBTCWallet(wallet).address;
	});

	/** Watches conversion value on a 15-minute interval. */
	public readonly watchConversion	= memoize(
		(
			amount: number,
			input: GenericCurrency,
			output: GenericCurrency
		) : Observable<number> =>
			timer(0, 900000).pipe(mergeMap(async () => this.convert(amount, input, output)))
	);

	/** Watches new transactions as they occur. */
	public readonly watchNewTransactions	= memoize(
		(wallet: IWallet) : Observable<Transaction> => {
			if (wallet.cryptocurrency !== Cryptocurrencies.BTC) {
				throw new Error('Unsupported cryptocurrency.');
			}

			return this.getSimpleBTCWallet(wallet).watchNewTransactions();
		}
	);

	/** Watches full transaction history sorted in descending order by timestamp. */
	public readonly watchTransactionHistory	= memoize(
		(wallet: IWallet) : Observable<Transaction[]> => {
			if (wallet.cryptocurrency !== Cryptocurrencies.BTC) {
				throw new Error('Unsupported cryptocurrency.');
			}

			return this.getSimpleBTCWallet(wallet).watchTransactionHistory();
		}
	);

	/** @ignore */
	private getSimpleBTCWallet (wallet: IWallet) : SimpleBTCWallet {
		return new SimpleBTCWallet(
			wallet.key && wallet.key.length > 0 ? {key: wallet.key} : {address: wallet.address}
		);
	}

	/** Converts between currency amounts. */
	public async convert (
		amount: number,
		input: GenericCurrency,
		output: GenericCurrency
	) : Promise<number> {
		if (
			(
				input.cryptocurrency !== undefined &&
				input.cryptocurrency !== Cryptocurrencies.BTC
			) ||
			(
				output.cryptocurrency !== undefined &&
				output.cryptocurrency !== Cryptocurrencies.BTC
			)
		) {
			throw new Error('Unsupported cryptocurrency.');
		}

		if (input.cryptocurrency !== undefined && output.cryptocurrency === undefined) {
			const exchangeRate	= (await getExchangeRates())[Currencies[output.currency]];
			return amount * exchangeRate;
		}
		else if (input.cryptocurrency === undefined && output.cryptocurrency !== undefined) {
			const exchangeRate	= (await getExchangeRates())[Currencies[input.currency]];
			return amount / exchangeRate;
		}
		else if (input.cryptocurrency !== undefined && output.cryptocurrency !== undefined) {
			return amount;
		}
		else {
			throw new Error('Converting between non-Bitcoin currencies is currently unsupported.');
		}
	}

	/** Generates new wallet. */
	public async generateWallet (
		{address, cryptocurrency = Cryptocurrencies.BTC, key}: {
			address?: string;
			cryptocurrency?: Cryptocurrencies;
			key?: Uint8Array|string;
		} = {}
	) : Promise<IWallet> {
		if (cryptocurrency !== Cryptocurrencies.BTC) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const wallet	= new SimpleBTCWallet({address, key});

		return {
			cryptocurrency,
			...(wallet.key ? {key: wallet.key.toBuffer()} : {address: wallet.address})
		};
	}

	/**
	 * Gets balance of a wallet.
	 * Will throw an error if a private key is required and not present.
	 */
	public async getBalance (
		wallet: IWallet,
		convert?: GenericCurrency,
		publicBalanceOnly: boolean = false
	) : Promise<number> {
		if (!wallet.key && !publicBalanceOnly && (
			wallet.cryptocurrency === Cryptocurrencies.XMR ||
			wallet.cryptocurrency === Cryptocurrencies.ZEC
		)) {
			throw new Error(
				`Private key required to get ${Cryptocurrencies[wallet.cryptocurrency]} balance.`
			);
		}

		if (
			wallet.cryptocurrency !== Cryptocurrencies.BTC ||
			(
				convert &&
				convert.cryptocurrency !== undefined &&
				convert.cryptocurrency !== Cryptocurrencies.BTC
			)
		) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const balance	= (await this.getSimpleBTCWallet(wallet).getBalance()).btc;

		return convert ? this.convert(balance, wallet, convert) : balance;
	}

	/** Returns full transaction history sorted in descending order by timestamp. */
	public async getTransactionHistory (wallet: IWallet) : Promise<Transaction[]> {
		if (wallet.cryptocurrency !== Cryptocurrencies.BTC) {
			throw new Error('Unsupported cryptocurrency.');
		}

		return this.getSimpleBTCWallet(wallet).getTransactionHistory();
	}

	/** Sends money. */
	public async send (wallet: IWallet, recipient: IWallet|string, amount: number) : Promise<void> {
		if (wallet.cryptocurrency !== Cryptocurrencies.BTC) {
			throw new Error('Unsupported cryptocurrency.');
		}

		if (typeof recipient !== 'string' && wallet.cryptocurrency !== recipient.cryptocurrency) {
			throw new Error(
				`Cannot send ${Cryptocurrencies[wallet.cryptocurrency]} to ${
					Cryptocurrencies[recipient.cryptocurrency]
				} address.`
			);
		}

		await this.getSimpleBTCWallet(wallet).send(
			typeof recipient === 'string' ? recipient : this.getSimpleBTCWallet(recipient).address,
			amount
		);
	}

	/**
	 * Watches balance of a wallet.
	 * @see getBalance
	 */
	public watchBalance (
		wallet: IWallet,
		convert?: GenericCurrency,
		publicBalanceOnly?: boolean
	) : Observable<number> {
		return this.watchBalanceInternal(wallet)(convert)(publicBalanceOnly);
	}

	constructor () {}
}
