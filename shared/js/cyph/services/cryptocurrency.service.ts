/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, Subject, timer} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {
	getExchangeRates,
	minimumTransactionAmount,
	setBlockchainAPIKey,
	Transaction,
	transactionFees,
	Wallet as SimpleBTCWallet
} from 'simplebtc';
import {BaseProvider} from '../base-provider';
import {GenericCurrency} from '../generic-currency-type';
import {
	BinaryProto,
	Cryptocurrencies,
	Currencies,
	IWallet,
	NumberProto
} from '../proto';
import {asyncToObservable} from '../util/flatten-observable';
import {debugLogError} from '../util/log';
import {saveFile} from '../util/save-file';
import {dynamicDeserialize, dynamicSerializeBytes} from '../util/serialization';
import {AnalyticsService} from './analytics.service';
import {ConfigService} from './config.service';
import {LocalStorageService} from './local-storage.service';

/**
 * Angular service for cryptocurrency.
 * Supported cryptocurrencies: BTC.
 */
@Injectable()
export class CryptocurrencyService extends BaseProvider {
	/** @ignore */
	private readonly cache = {
		balance: {
			_getKey: (simpleBTCWallet: SimpleBTCWallet) =>
				`CryptocurrencyService/balance/${simpleBTCWallet.address}`,
			getItem: async (simpleBTCWallet: SimpleBTCWallet) => {
				try {
					return await this.localStorageService.getItem(
						this.cache.balance._getKey(simpleBTCWallet),
						NumberProto
					);
				}
				catch {
					return 0;
				}
			},
			setItem: (simpleBTCWallet: SimpleBTCWallet, balance: number) => {
				this.localStorageService.setItem(
					this.cache.balance._getKey(simpleBTCWallet),
					NumberProto,
					balance
				);

				return balance;
			}
		},
		exchangeRates: {
			bitcoin: this.getExchangeRatesCache(false),
			bitcoinCash: this.getExchangeRatesCache(true)
		},
		transactionHistory: {
			_getKey: (simpleBTCWallet: SimpleBTCWallet) =>
				`CryptocurrencyService/transactions/${simpleBTCWallet.address}`,
			getItem: async (
				simpleBTCWallet: SimpleBTCWallet
			) : Promise<Transaction[]> => {
				try {
					return dynamicDeserialize(
						await this.localStorageService.getItem(
							this.cache.transactionHistory._getKey(
								simpleBTCWallet
							),
							BinaryProto
						)
					);
				}
				catch {
					return [];
				}
			},
			setItem: (
				simpleBTCWallet: SimpleBTCWallet,
				transactions: Transaction[]
			) => {
				this.localStorageService.setItem(
					this.cache.transactionHistory._getKey(simpleBTCWallet),
					BinaryProto,
					dynamicSerializeBytes(transactions)
				);

				return transactions;
			}
		}
	};

	/** @ignore */
	private readonly watchBalanceInternal = memoize((wallet: IWallet) =>
		memoize((convert?: GenericCurrency) =>
			memoize((publicBalanceOnly?: boolean) =>
				this.watchTransactionHistory(wallet).pipe(
					switchMap(async () =>
						this.getBalance(wallet, convert, publicBalanceOnly)
					)
				)
			)
		)
	);

	/** Indicates whether this client is having trouble fetching data from the Blockchain API. */
	public readonly blockchainFetchError = new BehaviorSubject(false);

	/** Gets address of a wallet. */
	public readonly getAddress = memoize(
		async (wallet: IWallet) : Promise<string> => {
			if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
				throw new Error('Unsupported cryptocurrency.');
			}

			return this.getSimpleBTCWallet(wallet).address;
		}
	);

	/** Cryptocurrency icons. */
	public readonly icons: Record<Cryptocurrencies, string> = {
		[Cryptocurrencies.BTC]: 'bitcoin',
		[Cryptocurrencies.BCH]: 'bitcoin',
		[Cryptocurrencies.CYPH]: 'bitcoin',
		[Cryptocurrencies.DASH]: 'bitcoin',
		[Cryptocurrencies.DOGE]: 'bitcoin',
		[Cryptocurrencies.ETH]: 'bitcoin',
		[Cryptocurrencies.FIL]: 'bitcoin',
		[Cryptocurrencies.LTC]: 'bitcoin',
		[Cryptocurrencies.NEO]: 'bitcoin',
		[Cryptocurrencies.XLM]: 'bitcoin',
		[Cryptocurrencies.XMR]: 'bitcoin',
		[Cryptocurrencies.XRB]: 'bitcoin',
		[Cryptocurrencies.XRP]: 'bitcoin',
		[Cryptocurrencies.WTC]: 'bitcoin',
		[Cryptocurrencies.ZEC]: 'bitcoin'
	};

	/** @see minimumTransactionAmount */
	public readonly minimumTransactionAmount = minimumTransactionAmount;

	/** Cryptocurrency names. */
	public readonly names: Record<Cryptocurrencies, string> = {
		[Cryptocurrencies.BTC]: 'Bitcoin',
		[Cryptocurrencies.BCH]: 'Bitcoin Cash',
		[Cryptocurrencies.CYPH]: 'Cyphcoin',
		[Cryptocurrencies.DASH]: 'Dash',
		[Cryptocurrencies.DOGE]: 'Dogecoin',
		[Cryptocurrencies.ETH]: 'Ethereum',
		[Cryptocurrencies.FIL]: 'Filecoin',
		[Cryptocurrencies.LTC]: 'Litecoin',
		[Cryptocurrencies.NEO]: 'Neo',
		[Cryptocurrencies.XLM]: 'Stellar',
		[Cryptocurrencies.XMR]: 'Monero',
		[Cryptocurrencies.XRB]: 'Nano',
		[Cryptocurrencies.XRP]: 'Ripple',
		[Cryptocurrencies.WTC]: 'Waltonchain',
		[Cryptocurrencies.ZEC]: 'Zcash'
	};

	/** Currently supported cryptocurrencies. */
	public readonly supportedCryptocurrencies = [
		Cryptocurrencies.BTC,
		Cryptocurrencies.BCH
	];

	/** Currently supported cryptocurrencies (set). */
	public readonly supportedCryptocurrenciesSet = new Set(
		this.supportedCryptocurrencies
	);

	/** Watches conversion value on a 15-minute interval. */
	public readonly watchConversion = memoize(
		(
			amount: number,
			input: GenericCurrency,
			output: GenericCurrency
		) : Observable<number> =>
			timer(0, 900000).pipe(
				switchMap(async () => this.convert(amount, input, output))
			)
	);

	/** Watches new transactions as they occur. */
	public readonly watchNewTransactions = memoize(
		(wallet: IWallet) : Observable<Transaction> => {
			if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
				throw new Error('Unsupported cryptocurrency.');
			}

			return this.getSimpleBTCWallet(wallet)
				.watchNewTransactions()
				.pipe(
					catchError(err => {
						debugLogError(() => ({
							watchNewTransactions: {
								blockchainFetchError: err
							}
						}));

						this.blockchainFetchError.next(true);
						return new Subject<Transaction>();
					})
				);
		}
	);

	/** Watches full transaction history sorted in descending order by timestamp. */
	public readonly watchTransactionHistory = memoize(
		(wallet: IWallet) : Observable<Transaction[]> => {
			if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
				throw new Error('Unsupported cryptocurrency.');
			}

			const simpleBTCWallet = this.getSimpleBTCWallet(wallet);

			const transactionsObservable: Observable<Transaction[]> =
				simpleBTCWallet.watchTransactionHistory().pipe(
					catchError(err => {
						debugLogError(() => ({
							watchTransactionHistory: {
								blockchainFetchError: err
							}
						}));

						this.blockchainFetchError.next(true);
						return asyncToObservable(
							this.cache.transactionHistory.getItem(
								simpleBTCWallet
							)
						);
					})
				);

			this.subscriptions.push(
				transactionsObservable.subscribe(transactions => {
					this.cache.transactionHistory.setItem(
						simpleBTCWallet,
						transactions
					);
				})
			);

			return transactionsObservable;
		}
	);

	/** @ignore */
	private getExchangeRatesCache (bitcoinCash: boolean) : {
		getExchangeRates: () => Promise<{
			[currencyCode: string]: number;
		}>;
		getItem: () => Promise<Record<string, number>>;
		setItem: (
			exchangeRates: Record<string, number>
		) => Record<string, number>;
	} {
		const key = bitcoinCash ?
			'CryptocurrencyService/exchangeRates/BCH' :
			'CryptocurrencyService/exchangeRates/BTC';

		return {
			getExchangeRates: async () => getExchangeRates(bitcoinCash),
			getItem: async () : Promise<Record<string, number>> => {
				try {
					return dynamicDeserialize(
						await this.localStorageService.getItem(key, BinaryProto)
					);
				}
				catch {
					return {};
				}
			},
			setItem: (exchangeRates: Record<string, number>) => {
				this.localStorageService.setItem(
					key,
					BinaryProto,
					dynamicSerializeBytes(exchangeRates)
				);

				return exchangeRates;
			}
		};
	}

	/** @ignore */
	private getSimpleBTCWallet (wallet: IWallet) : SimpleBTCWallet {
		if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const bitcoinCash = wallet.cryptocurrency === Cryptocurrencies.BCH;

		return new SimpleBTCWallet(
			wallet.key && wallet.key.length > 0 ?
				{
					bitcoinCash,
					key: wallet.key,
					uncompressedPublicKey: wallet.uncompressedPublicKey
				} :
				{
					address: wallet.address,
					bitcoinCash
				}
		);
	}

	/**
	 * Converts between currency amounts.
	 * TODO: Rewrite this to be more flexible and/or remove simplebtc dependency.
	 */
	public async convert (
		amount: number,
		input: GenericCurrency,
		output: GenericCurrency
	) : Promise<number> {
		if (
			(input.cryptocurrency !== undefined &&
				!this.supportedCryptocurrenciesSet.has(input.cryptocurrency)) ||
			(output.cryptocurrency !== undefined &&
				!this.supportedCryptocurrenciesSet.has(output.cryptocurrency))
		) {
			throw new Error('Unsupported cryptocurrency.');
		}

		if (
			input.cryptocurrency !== undefined &&
			output.cryptocurrency !== undefined &&
			input.cryptocurrency !== output.cryptocurrency
		) {
			throw new Error(
				'Converting between two cryptocurrencies is currently unsupported.'
			);
		}

		const bitcoinCash =
			input.cryptocurrency === Cryptocurrencies.BCH ||
			output.cryptocurrency === Cryptocurrencies.BCH;

		const exchangeRates = bitcoinCash ?
			this.cache.exchangeRates.bitcoinCash :
			this.cache.exchangeRates.bitcoin;

		const cacheExchangeRates = async () => {
			try {
				return exchangeRates.setItem(
					await exchangeRates.getExchangeRates()
				);
			}
			catch (err) {
				debugLogError(() => ({
					convert: {
						blockchainFetchError: err
					}
				}));

				this.blockchainFetchError.next(true);
				return exchangeRates.getItem();
			}
		};

		if (
			input.cryptocurrency !== undefined &&
			output.cryptocurrency === undefined
		) {
			const exchangeRate = (await cacheExchangeRates())[
				Currencies[output.currency]
			];

			if (isNaN(exchangeRate)) {
				return 0;
			}

			return amount * exchangeRate;
		}
		if (
			input.cryptocurrency === undefined &&
			output.cryptocurrency !== undefined
		) {
			const exchangeRate = (await cacheExchangeRates())[
				Currencies[input.currency]
			];

			if (isNaN(exchangeRate)) {
				return 0;
			}

			return amount / exchangeRate;
		}
		if (
			input.cryptocurrency !== undefined &&
			output.cryptocurrency !== undefined
		) {
			return amount;
		}

		throw new Error(
			'Converting between non-crypto-currencies is currently unsupported.'
		);
	}

	/** Exports wallet data for external backup. */
	public async exportWallet (wallet: IWallet) : Promise<void> {
		await saveFile(
			this.getSimpleBTCWallet(wallet).key.toWIF(),
			`wallet.${Cryptocurrencies[
				wallet.cryptocurrency
			].toLowerCase()}.wif`
		);
	}

	/** Generates new wallet. */
	public async generateWallet ({
		address,
		cryptocurrency = Cryptocurrencies.BTC,
		key,
		uncompressedPublicKey = false
	}: {
		address?: string;
		cryptocurrency?: Cryptocurrencies;
		key?: Uint8Array | string;
		uncompressedPublicKey?: boolean;
	} = {}) : Promise<IWallet> {
		if (!this.supportedCryptocurrenciesSet.has(cryptocurrency)) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const wallet = new SimpleBTCWallet({
			address,
			bitcoinCash: cryptocurrency === Cryptocurrencies.BCH,
			key,
			uncompressedPublicKey
		});

		return {
			cryptocurrency,
			...(wallet.key ?
				{key: wallet.key.toBuffer(), uncompressedPublicKey} :
				{address: wallet.address})
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
		if (
			!wallet.key &&
			!publicBalanceOnly &&
			(wallet.cryptocurrency === Cryptocurrencies.XMR ||
				wallet.cryptocurrency === Cryptocurrencies.ZEC)
		) {
			throw new Error(
				`Private key required to get ${
					Cryptocurrencies[wallet.cryptocurrency]
				} balance.`
			);
		}

		if (
			!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency) ||
			(convert?.cryptocurrency !== undefined &&
				!this.supportedCryptocurrenciesSet.has(convert.cryptocurrency))
		) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const simpleBTCWallet = this.getSimpleBTCWallet(wallet);

		let balance = 0;
		try {
			balance = this.cache.balance.setItem(
				simpleBTCWallet,
				(await simpleBTCWallet.getBalance()).btc
			);
		}
		catch (err) {
			debugLogError(() => ({
				getBalance: {
					blockchainFetchError: err
				}
			}));

			this.blockchainFetchError.next(true);
			balance = await this.cache.balance.getItem(simpleBTCWallet);
		}

		return convert ? this.convert(balance, wallet, convert) : balance;
	}

	/** Returns transaction fee for wallet's currency. */
	public getTransactionFee (_WALLET: IWallet) : number {
		return transactionFees.bitcoin;
	}

	/** Returns full transaction history sorted in descending order by timestamp. */
	public async getTransactionHistory (
		wallet: IWallet
	) : Promise<Transaction[]> {
		if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
			throw new Error('Unsupported cryptocurrency.');
		}

		const simpleBTCWallet = this.getSimpleBTCWallet(wallet);

		try {
			return this.cache.transactionHistory.setItem(
				simpleBTCWallet,
				await simpleBTCWallet.getTransactionHistory()
			);
		}
		catch (err) {
			debugLogError(() => ({
				getTransactionHistory: {
					blockchainFetchError: err
				}
			}));

			this.blockchainFetchError.next(true);
			return this.cache.transactionHistory.getItem(simpleBTCWallet);
		}
	}

	/** Sends money. */
	public async send (
		wallet: IWallet,
		recipient: IWallet | string,
		amount: number
	) : Promise<void> {
		if (!this.supportedCryptocurrenciesSet.has(wallet.cryptocurrency)) {
			throw new Error('Unsupported cryptocurrency.');
		}

		if (
			typeof recipient !== 'string' &&
			wallet.cryptocurrency !== recipient.cryptocurrency
		) {
			throw new Error(
				`Cannot send ${Cryptocurrencies[wallet.cryptocurrency]} to ${
					Cryptocurrencies[recipient.cryptocurrency]
				} address.`
			);
		}

		await this.getSimpleBTCWallet(wallet).send(
			typeof recipient === 'string' ?
				recipient :
				this.getSimpleBTCWallet(recipient).address,
			amount
		);

		this.analyticsService.sendEvent('cryptocurrency', 'sent');
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

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService
	) {
		super();

		setBlockchainAPIKey(this.configService.blockchainAPIKey);
	}
}
