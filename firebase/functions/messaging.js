const sendMessage	= async (database, messaging, url, body) => messaging.sendToDevice(
	Object.keys(database.ref(url).val() || {}),
	{
		notification: {
			body,
			icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png',
			title: 'Cyph'
		}
	}
);


module.exports	= {sendMessage};
