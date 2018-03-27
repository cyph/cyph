import {Injectable} from '@angular/core';
import {GenericCurrency} from '../generic-currency-type';
import {Cryptocurrencies, IWallet} from '../proto';


/**
 * Angular service for cryptocurrency.
 * NOTE: Dummy service for now.
 */
@Injectable()
export class CryptocurrencyService {
	/** Converts between currency amounts. */
	public async convert (
		_AMOUNT: number,
		_INPUT: GenericCurrency,
		_OUTUT: GenericCurrency
	) : Promise<number> {
		return 4.2;
	}

	/** Generates new wallet. */
	public async generateWallet (
		cryptocurrency: Cryptocurrencies = Cryptocurrencies.Bitcoin
	) : Promise<IWallet> {
		return {
			cryptocurrency,
			privateKey: new Uint8Array(0),
			publicKey: new Uint8Array(0)
		};
	}

	/** Gets address of a wallet. */
	public async getAddress (wallet: IWallet) : Promise<string> {
		return '1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd';
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
		if (!wallet.privateKey && !publicBalanceOnly && (
			wallet.cryptocurrency === Cryptocurrencies.Monero ||
			wallet.cryptocurrency === Cryptocurrencies.Zcash
		)) {
			throw new Error(
				`Private key required to get ${Cryptocurrencies[wallet.cryptocurrency]} balance.`
			);
		}

		const balance	= 1337;
		return convert ? this.convert(balance, wallet, convert) : balance;
	}

	/** Returns full transaction history sorted in ascending order by timestamp. */
	public async getTransactionHistory (_WALLET: IWallet) : Promise<{
		amount: number;
		recipient: string;
		sender: string;
		timestamp: number;
	}[]> {
		return [
			{
				amount: 0.002,
				recipient: '1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd',
				sender: '1E4G7mwKozrTSUijjB2eFqgbU9zxToZbkz',
				timestamp: -296938800000
			},
			{
				amount: 1000000,
				recipient: '3P3QsMVK89JBNqZQv5zMAKG8FK3kJM4rjt',
				sender: '1Cyph47AKhyG8mP9SPxd2ELTB2iGyJjfnd',
				timestamp: 1497665016872
			}
		];
	}

	/** Sends money. */
	public async send (
		_WALLET: IWallet,
		_RECIPIENT: IWallet|string,
		_AMOUNT: number
	) : Promise<void> {}

	constructor () {}
}
