export enum CJPNotificationType {
	error = "error",
	warning = "warning",
	info = "info",
}

export class CJPNotification {
	constructor(
		public readonly type: CJPNotificationType,
		public readonly message: string,
	) { }
}