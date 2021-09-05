import {proto, util} from '@cyph/sdk';
import {
	admin,
	database,
	getName,
	getRealUsername,
	notify,
	pushItem
} from './init.js';

const {AccountFileRecord, AccountNotification, NotificationTypes} = proto;
const {normalize, titleize} = util;

/* TODO: Translations and user block lists. */
export const notifyUser = async (
	data,
	namespace,
	username,
	serverInitiated
) => {
	const notification = data;
	const metadata =
		typeof notification.metadata === 'object' ? notification.metadata : {};
	const now = Date.now();

	const notificationID =
		metadata.id &&
		typeof metadata.id === 'string' &&
		metadata.id.indexOf(',') < 0 ?
			metadata.id :
			undefined;

	if (!notification || !notification.target || isNaN(notification.type)) {
		return;
	}

	notification.target = normalize(notification.target);

	const userPath = `${namespace}/users/${notification.target}`;

	const groupID =
		notification.type === NotificationTypes.Message && metadata.groupID ?
			normalize(metadata.groupID) :
			undefined;

	const unreadMessagesID =
		notification.type === NotificationTypes.Message ?
			groupID || username :
			'';

	const activeCall =
		notification.type === NotificationTypes.Call &&
		(metadata.callType === 'audio' ||
			metadata.callType === 'video' ||
			metadata.callType === 'chat') &&
		!metadata.missed &&
		typeof metadata.expires === 'number' &&
		metadata.expires > now;

	const callMetadata = activeCall ?
		`${metadata.callType},${username || ''},${
			groupID || ''
		},${notificationID},${metadata.expires.toString()}` :
		undefined;

	const [senderName, senderUsername, targetName, badge, count] =
		await Promise.all([
			getName(namespace, username),
			getRealUsername(namespace, username),
			getName(namespace, notification.target),
			Promise.all([
				database
					.ref(`${userPath}/incomingFiles`)
					.once('value')
					.then(o => [o.val()])
					.catch(() => []),
				database
					.ref(`${userPath}/unreadMessages`)
					.once('value')
					.then(o => Object.values(o.val()))
					.catch(() => [])
			]).then(values =>
				values
					.reduce((a, b) => a.concat(b), [])
					.map(o => Object.keys(o || {}).length)
					.reduce((a, b) => a + b, 0)
			),
			(async () => {
				if (!notificationID) {
					return;
				}

				const hasFile = async () =>
					(
						await database
							.ref(`${userPath}/fileReferences/${notificationID}`)
							.once('value')
					).exists();

				const [child, path] = activeCall ?
					[false, `incomingCalls/${callMetadata}`] :
				notification.type === NotificationTypes.File ?
					[
						true,
						!(await hasFile()) ?
							'unreadFiles/' +
							(!isNaN(metadata.fileType) &&
							metadata.fileType in AccountFileRecord.RecordTypes ?
								metadata.fileType :
								AccountFileRecord.RecordTypes.File
							).toString() :
							undefined
					] :
				notification.type === NotificationTypes.Message &&
					unreadMessagesID ?
					[true, `unreadMessages/${unreadMessagesID}`] :
					[];

				if (!path) {
					return;
				}

				const notificationRef = database.ref(
					`${userPath}/${path}${child ? `/${notificationID}` : ''}`
				);

				await notificationRef.set({
					data: '',
					hash: '',
					timestamp: admin.database.ServerValue.TIMESTAMP
				});

				if (!notificationRef.parent) {
					return;
				}

				return Object.keys(
					(await notificationRef.parent.once('value')).val() || {}
				).length;
			})()
				.catch(err => {
					console.error(err);
				})
				.then(n => (typeof n !== 'number' || isNaN(n) ? 1 : n))
		]);

	const callString =
		metadata.callType === 'chat' ?
			'Burner Chat' :
		metadata.callType === 'video' ?
			'Video Call' :
			'Call';
	const contactString = metadata.innerCircle ? 'Inner Circle' : 'contact';

	const {
		actions,
		additionalData = {},
		eventDetails,
		subject,
		tag = notificationID,
		text
	} = notification.type === NotificationTypes.CalendarEvent ?
		{
			eventDetails: {
					description: metadata.description,
					endTime: isNaN(metadata.endTime) ?
							now + 3600000 :
							metadata.endTime,
					inviterUsername: senderUsername,
					location: metadata.location,
					startTime: isNaN(metadata.startTime) ?
							now + 1800000 :
							metadata.startTime,
					title: metadata.title || 'Cyph Appointment'
				},
			subject: `Calendar Invite from ${senderUsername}`,
			text: `${targetName}, ${senderName} has sent an appointment request.`
		} :
	activeCall ?
		{
			actions: [
					{
						icon: 'call_end',
						title: 'Decline',
						callback: 'callReject',
						foreground: false
					},
					{
						icon: 'call',
						title: 'Answer',
						callback: 'callAccept',
						foreground: true
					}
				],
			subject: `Incoming ${callString} from ${senderUsername}`,
			text: `${targetName}, ${senderUsername} is calling you.`
		} :
	notification.type === NotificationTypes.Call ?
		{
			actions: [
					{
						icon: 'call',
						title: 'Call Back',
						callback: 'callBack',
						foreground: true
					}
				],
			subject: `Missed ${callString} from ${senderUsername}`,
			text: `${targetName}, ${senderUsername} tried to call you.`
		} :
	notification.type === NotificationTypes.ContactAccept && serverInitiated ?
		{
			subject: `${titleize(
				contactString
			)} Confirmation from ${senderUsername}`,
			text: `${targetName}, ${senderName} has accepted your ${contactString} request.`
		} :
	notification.type === NotificationTypes.ContactRequest && serverInitiated ?
		{
			subject: `${titleize(
				contactString
			)} Request from ${senderUsername}`,
			text:
				`${targetName}, ${senderName} wants to join your ${contactString} list. ` +
				`Log in to accept or decline.`
		} :
	notification.type === NotificationTypes.Message ?
		{
			additionalData: {groupID},
			subject: `${
				count > 1 ?
					`${count} new ${groupID ? 'group ' : ''}messages` :
					`New ${groupID ? 'Group ' : ''}Message`
			} from ${senderUsername}`,
			tag: unreadMessagesID,
			text: `${targetName}, ${senderName} has sent you a ${
				groupID ? 'group ' : ''
			}message.`
		} :
	notification.type === NotificationTypes.Yo ?
		{
			subject: `Sup Dog, it's ${senderUsername}`,
			text: `${targetName}, ${senderName} says yo.`
		} :
	notification.type !== NotificationTypes.File ?
		{} :
	metadata.fileType === AccountFileRecord.RecordTypes.Appointment ?
		{
			subject: `Appointment Request from ${senderUsername}`,
			text: `${targetName}, ${senderName} has requested an appointment with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Doc ?
		{
			subject: `Incoming Document from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a document with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.EhrApiKey ?
		{
			subject: `Incoming EHR Access from ${senderUsername}`,
			text: `${targetName}, ${senderName} has granted you access to an EHR system.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Email ?
		{
			subject: `Encrypted Email from ${senderUsername}`,
			text: `${targetName}, ${senderName} has sent you a secure email.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.File ?
		{
			subject: `Incoming File from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a file with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Form ?
		{
			subject: `Incoming Form from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a form with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.MessagingGroup ?
		{
			subject: `Group Invite from ${senderUsername}`,
			text: `${targetName}, ${senderName} has invited you to join a group chat.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Note ?
		{
			subject: `Incoming Note from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a note with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Password ?
		{
			subject: `Incoming Password from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a password with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.RedoxPatient ?
		{
			subject: `Incoming Patient Data from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a patient with you.`
		} :
	metadata.fileType === AccountFileRecord.RecordTypes.Wallet ?
		{
			subject: `Incoming Wallet from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared a cryptocurrency wallet with you.`
		} :
		{
			subject: `Incoming Data from ${senderUsername}`,
			text: `${targetName}, ${senderName} has shared something with you.`
		};

	if (!subject || !text) {
		throw new Error(`Invalid notification type: ${notification.type}`);
	}

	await Promise.all([
		notify(
			namespace,
			notification.target,
			subject,
			text,
			eventDetails,
			{
				actions,
				additionalData: {
					...additionalData,
					activeCall,
					callMetadata,
					notificationID,
					notificationType: notification.type,
					senderUsername,
					tag
				},
				badge,
				ring: activeCall,
				tag: `${notification.type}_${tag}`
			},
			true
		),
		pushItem(
			namespace,
			`users/${notification.target}/notifications`,
			AccountNotification,
			{
				actions,
				callMetadata,
				eventID: notificationID,
				fileType: metadata.fileType,
				isRead: false,
				messagesID: groupID,
				text: subject,
				textDetail: text,
				timestamp: now,
				type: notification.type,
				username
			}
		)
	]);
};
