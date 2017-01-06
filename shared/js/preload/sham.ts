/**
 * @file Fakes out stuff insecurely for demo purposes.
 * (Should ONLY ever be used by cyph.com.)
 */


(<any> self).firebase	= {
	apps: [{
		storage: () => ({
			ref: () => ({
				put: (blob: Blob) => {
					const snapshot: firebase.storage.UploadTaskSnapshot	= {
						bytesTransferred: 0,
						downloadURL: URL.createObjectURL(blob),
						metadata: <firebase.storage.FullMetadata> {},
						ref: <firebase.storage.Reference> {},
						state: <firebase.storage.TaskState> {},
						task: <firebase.storage.UploadTask> {},
						totalBytes: blob.size
					};

					return {
						snapshot,
						cancel: () => {},
						on: async (
							_EVENT_TYPE: string,
							onStateChanged:
								(snapshot: firebase.storage.UploadTaskSnapshot) => void
							,
							_ON_ERROR: (err: any) => void,
							onComplete: () => void
						) => {
							/* Fake out 50 Mb/s connection */
							while (snapshot.bytesTransferred < snapshot.totalBytes) {
								/* tslint:disable-next-line:ban */
								await new Promise<void>(resolve => {
									setTimeout(() => { resolve(); }, 250);
								});

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
	}]
};
