/**
 * @file Fakes out Firebase (Storage only) for demo purposes.
 */


(<any> self).firebase	= {
	initializeApp: () => ({
		storage: () => ({
			ref: () => ({
				put: (blob: Blob) => {
					const snapshot: firebase.UploadTaskSnapshot	= {
						bytesTransferred: 0,
						downloadURL: URL.createObjectURL(blob),
						metadata: null,
						ref: null,
						state: null,
						task: null,
						totalBytes: blob.size
					};

					return {
						snapshot,
						cancel: () => {},
						on: async (
							_: string,
							onStateChanged: (snapshot: firebase.UploadTaskSnapshot) => void,
							onError: (err: any) => void,
							onComplete: () => void
						) => {
							/* Fake out 50 Mb/s connection */
							while (snapshot.bytesTransferred < snapshot.totalBytes) {
								await new Promise(resolve => setTimeout(() => resolve(), 250));

								snapshot.bytesTransferred	= Math.min(
									snapshot.bytesTransferred + 1638400,
									snapshot.totalBytes
								);

								onStateChanged(snapshot);
							}

							onComplete();
						}
					};
				}
			}),
			refFromURL: () => ({
				delete: () => {}
			})
		})
	})
};
