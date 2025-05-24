import * as path from 'path';
import { workspace, ExtensionContext, window } from 'vscode';
import { CJPNotification, CJPNotificationType, APP_ID } from '@custom-japanese-proofreading/common';

// TODO: アイコンを作る

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	const serverModule = context.asAbsolutePath(
		path.join('packages', 'server', 'out', 'server.js')
	);
	const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		}
	};

	// 言語クライアントを制御する設定
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{ scheme: "file", language: "html" },
			{ scheme: "file", language: "latex" },
			{ scheme: "file", language: "review" },
			{ scheme: "file", language: "plaintext" },
			{ scheme: "file", language: "markdown" },
		],
		synchronize: {
			// ワークスペース内の .clientrc ファイルの変更についてサーバーに通知
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};
	client = new LanguageClient(
		"customJapaneseProofreading",
		"カスタム日本語校正LSP",
		serverOptions,
		clientOptions
	);
	client.onNotification(
		APP_ID,
		(notification: CJPNotification) => {
			switch (notification.type) {
				case CJPNotificationType.error:
					window.showErrorMessage(notification.message);
					break;
				case CJPNotificationType.warning:
					window.showWarningMessage(notification.message);
					break;
				case CJPNotificationType.info:
					window.showInformationMessage(notification.message);
					break;
				default:
					window.showInformationMessage(
						`不明な通知タイプ: ${notification.type} - メッセージ: ${notification.message}`,
					);
					break;
			}
		},
	);
	client.start();

}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
