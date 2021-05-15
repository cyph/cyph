import {configService as config, proto, util} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {sendEmailInternal} from '../email.js';
import {
	admin,
	auth,
	database,
	isUsernameBlacklisted,
	onCall,
	removeItem,
	setItem
} from '../init.js';
import {mailchimp, removeFromMailingList} from '../mailchimp.js';
import {stripe} from '../stripe.js';
import {validateEmail} from '../validation.js';

const {BinaryProto, BooleanProto, CyphPlan, CyphPlans, StringProto} = proto;
const {normalize} = util;

export const register = onCall(
	async (data, namespace, getUsername, testEnvName) => {
		const {
			altMasterKey,
			certificateRequest,
			encryptionKeyPair,
			inviteCode,
			loginData,
			loginDataAlt,
			password,
			pinHash,
			pinIsCustom,
			pseudoAccount,
			publicEncryptionKey,
			publicProfile,
			publicProfileExtra,
			signingKeyPair,
			username
		} = data || {};

		const email = validateEmail(data.email, true);

		if (
			typeof inviteCode !== 'string' ||
			inviteCode.length < 1 ||
			typeof password !== 'string' ||
			password.length < 1 ||
			typeof username !== 'string' ||
			username.length < 1
		) {
			throw new Error('Invalid credentials for new account.');
		}

		const inviteDataRef = database.ref(
			`${namespace}/inviteCodes/${inviteCode}`
		);

		const inviteData = (await inviteDataRef.once('value')).val() || {};
		const {
			appStoreReceipt,
			braintreeID,
			braintreeSubscriptionID,
			inviterUsername,
			keybaseUsername,
			planTrialEnd,
			reservedUsername,
			stripe: stripeData
		} = inviteData;
		const plan =
			inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

		if (typeof inviterUsername !== 'string') {
			throw new Error('Invalid invite code.');
		}

		if (
			(username.length < config.planConfig[plan].usernameMinLength &&
				!(
					reservedUsername && username === normalize(reservedUsername)
				)) ||
			(await isUsernameBlacklisted(namespace, username, reservedUsername))
		) {
			throw new Error('Blacklisted username.');
		}

		const userRecord = await auth.createUser({
			disabled: false,
			email: `${username}@${namespace.replace(/_/g, '.')}`,
			emailVerified: true,
			password
		});

		const initialEmailAddressRef = !email ?
			undefined :
			database.ref(
				`${namespace}/initialEmailAddresses/${Buffer.from(
					email
				).toString('hex')}`
			);

		const pendingInviteRef = database.ref(
			`${namespace}/pendingInvites/${inviteCode}`
		);

		const setRegisterItems = async items =>
			Promise.all(
				items.map(async ([k, v, proto = BinaryProto]) =>
					setItem(namespace, `users/${username}/${k}`, proto, v)
				)
			);

		const permanentReservedUsername = reservedUsername ?
			(
				await database
					.ref(`${namespace}/reservedUsernames/${username}`)
					.once('value')
			).val() === '.' :
			false;

		await Promise.all([
			setRegisterItems([
				['altMasterKey', altMasterKey],
				['encryptionKeyPair', encryptionKeyPair],
				['inviteCode', inviteCode, StringProto],
				['pin/hash', pinHash],
				['pin/isCustom', pinIsCustom],
				['profileVisible', true, BooleanProto],
				['publicEncryptionKey', publicEncryptionKey],
				['publicProfile', publicProfile],
				['publicProfileExtra', publicProfileExtra],
				['signingKeyPair', signingKeyPair],
				pseudoAccount ?
					['pseudoAccount', new Uint8Array(0)] :
					['certificateRequest', certificateRequest]
			]),
			inviteDataRef.remove(),
			setItem(
				namespace,
				`users/${username}/inviterUsernamePlaintext`,
				StringProto,
				inviterUsername
			),
			setItem(namespace, `users/${username}/plan`, CyphPlan, {
				plan
			}),
			database.ref(`${namespace}/consumedInviteCodes/${inviteCode}`).set({
				...(email ? {email} : {}),
				username
			}),
			!initialEmailAddressRef ||
			(await initialEmailAddressRef.once('value')).exists() ?
				undefined :
				initialEmailAddressRef.set({
					inviteCode,
					username
				}),
			!appStoreReceipt ?
				undefined :
				database
					.ref(
						`${namespace}/users/${username}/internal/appStoreReceipt`
					)
					.set(appStoreReceipt),
			!braintreeID ?
				undefined :
				database
					.ref(`${namespace}/users/${username}/internal/braintreeID`)
					.set(braintreeID),
			!braintreeSubscriptionID ?
				undefined :
				database
					.ref(
						`${namespace}/users/${username}/internal/braintreeSubscriptionID`
					)
					.set(braintreeSubscriptionID),
			!stripeData ?
				undefined :
				database
					.ref(`${namespace}/users/${username}/internal/stripe`)
					.set(stripeData),
			!inviterUsername ?
				undefined :
				removeItem(
					namespace,
					`users/${inviterUsername}/inviteCodes/${inviteCode}`
				).catch(() => {}),
			!keybaseUsername ?
				undefined :
				database
					.ref(
						`${namespace}/users/${username}/internal/keybaseUsername`
					)
					.set(keybaseUsername),
			isNaN(planTrialEnd) ?
				undefined :
				database
					.ref(`${namespace}/users/${username}/internal/planTrialEnd`)
					.set(planTrialEnd),
			reservedUsername &&
			(!permanentReservedUsername || reservedUsername === username) ?
				database
					.ref(
						`${namespace}/reservedUsernames/${normalize(
							reservedUsername
						)}`
					)
					.remove() :
				undefined,
			stripeData ?
				stripe.subscriptionItems
					.update(stripeData.subscriptionItemID, {
						metadata: {username}
					})
					.catch(() => {}) :
				undefined,
			pendingInviteRef
				.once('value')
				.then(
					async o =>
						mailchimp &&
						mailchimpCredentials &&
						mailchimpCredentials.listIDs &&
						mailchimpCredentials.listIDs.pendingInvites &&
						removeFromMailingList(
							mailchimpCredentials.listIDs.pendingInvites,
							o.val()
						)
				)
				.catch(() => {})
				.then(async () => pendingInviteRef.remove())
		]);

		await setRegisterItems([
			['loginData', loginData],
			['loginDataAlt', loginDataAlt]
		]);

		if (email) {
			await setItem(
				namespace,
				`users/${username}/email`,
				StringProto,
				email
			);
		}

		await Promise.all([
			database.ref(`${namespace}/pendingSignups/${username}`).set({
				timestamp: admin.database.ServerValue.TIMESTAMP,
				uid: userRecord.uid
			}),
			sendEmailInternal(
				'user-registrations@cyph.com',
				`${
					testEnvName ?
						`${testEnvName.replace(/^(.)/, s =>
							s.toUpperCase()
						)}: ` :
						''
				}Cyph User Registration`,
				userRecord.email
			)
		]);
	}
);
