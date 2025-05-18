import {
	createConnection,
	Connection,
	TextDocuments,
	Diagnostic,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationRegistrationOptions,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	TextDocumentEdit,
	TextEdit,
	CodeActionKind,
	CodeAction,
	CodeActionParams,
} from 'vscode-languageserver/node';

import { validateTextDocument } from './validation';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { APP_NAME, APP_ID, UserSettings, APP_CONFIG_HEADER } from '@custom-japanese-proofreading/common';

// NodeのIPCを使用してサーバーの接続を作成
// プレビュー/提案されたすべてのLSP機能を含む
const connection: Connection = createConnection(ProposedFeatures.all);

// テキストドキュメントを管理するクラスを作成します。
const documents = new TextDocuments<TextDocument>(TextDocument);

// VSCode側の設定
const userSettings = UserSettings.getInstanceWithConnection(connection);

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	userSettings.hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	// hasWorkspaceFolderCapability = !!(
	// 	capabilities.workspace && !!capabilities.workspace.workspaceFolders
	// );
	// hasDiagnosticRelatedInformationCapability = !!(
	// 	capabilities.textDocument &&
	// 	capabilities.textDocument.publishDiagnostics &&
	// 	capabilities.textDocument.publishDiagnostics.relatedInformation
	// );

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			codeActionProvider: true, // connection.onCodeAction を有効にする
		}
	};
	// if (hasWorkspaceFolderCapability) {  
	// 	result.capabilities.workspace = {
	// 		workspaceFolders: {
	// 			supported: true
	// 		}
	// 	};
	// }
	return result;
});

connection.onInitialized(() => {
	if (userSettings.hasConfigurationCapability) {
		// すべての設定変更を登録
		// 設定が変更された場合、onDidChangeConfigurationが呼び出される。
		// ただし、設定の内容は送信されないので、サーバ側で取得する必要がある。
		connection.client.register(
			DidChangeConfigurationNotification.type,
			{ section: APP_CONFIG_HEADER } as DidChangeConfigurationRegistrationOptions,
		);
	}
	// if (hasWorkspaceFolderCapability) {
	// 	connection.workspace.onDidChangeWorkspaceFolders(_event => {
	// 		connection.console.log('Workspace folder change event received.');
	// 	});
	// }
});

/**
 * コードアクションのハンドラです。
 * クイックフィックス機能の追加を行っています。
 */
connection.onCodeAction((params: CodeActionParams) => {
	const textDocument = documents.get(params.textDocument.uri);
	// コードアクションの種類にクイックフィックスが存在するか？
	const hasQuickFix = params.context.only?.some((kind) => kind === CodeActionKind.QuickFix) ?? false;
	if (!textDocument || !hasQuickFix) {
		return;
	}

	// この拡張機能の診断結果を取得
	const diagnostics = params.context.diagnostics.filter(v => v.source === APP_NAME);
	// 修正可能な診断結果は、クイックフィックスを追加
	const quickFixActions = diagnostics.filter(v => v.data !== undefined).map((diagnostic) => {
		return createQuickFixAction(diagnostic, textDocument);
	});
	return quickFixActions;
});

// 設定が変更された場合、onDidChangeConfigurationが呼び出される。
// ドキュメント固有の設定をすべて消してから、
// ドキュメントの設定を取得し、
// 設定が読み込まれてから（then）、バリデーションを実行する。
connection.onDidChangeConfiguration((_) => {
	if (userSettings.hasConfigurationCapability) {
		// Reset all cached document settings
		userSettings.ofDocuments.clear();
	} else {
		console.warn(
			`[${APP_ID}] onDidChangeConfiguration: hasConfigurationCapability is false.`
		);
		console.warn(
			"開発者に連絡してください。"
		);
	}

	// Revalidate all open text documents
	documents.all().forEach((textDocument) => {
		userSettings.cacheDocumentSettings(textDocument.uri).then(() => {
			validateTextDocument(
				textDocument,
				userSettings,
			);
		});
	});
});

documents.onDidOpen(async (open) => {
	// ドキュメントを開いたときに、設定を取得します。
	await userSettings.cacheDocumentSettings(open.document.uri);
	// ドキュメントの内容が変更された場合、バリデーションを実行します。
	validateTextDocument(
		open.document,
		userSettings,
	);
});

// Only keep settings for open documents
documents.onDidClose((close) => {
	userSettings.ofDocuments.delete(close.document.uri);
	resetTextDocument(close.document);
});

// connection.languages.diagnostics.on(async (params) => {
// 	const document = documents.get(params.textDocument.uri);
// 	if (document !== undefined) {
// 		return {
// 			kind: DocumentDiagnosticReportKind.Full,
// 			items: await validateTextDocument(document)
// 		} satisfies DocumentDiagnosticReport;
// 	} else {
// 		// We don't know the document. We can either try to read it from disk
// 		// or we don't report problems for it.
// 		return {
// 			kind: DocumentDiagnosticReportKind.Full,
// 			items: []
// 		} satisfies DocumentDiagnosticReport;
// 	}
// });

// ドキュメントを初めて開いた時と内容に変更があった際に実行します。
documents.onDidChangeContent(async (change) => {
	const diagnostics = await validateTextDocument(
		change.document,
		userSettings,
	);
	// 診断結果をVSCodeに送信。UIに表示される。
	connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});


connection.onDidChangeWatchedFiles(_change => {
	// モニターしているファイルに変更があった場合
	connection.console.log('ファイルの変更通知を受信');
});


/**
 * validate済みの内容を破棄します。
 * @param textDocument
 */
const resetTextDocument = async (textDocument: TextDocument): Promise<void> => {
	const diagnostics: Diagnostic[] = [];
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
};

/**
 * 診断結果の自動修正が可能な場合、クイックフィックスのコードアクションを作成します。
 * @param diagnostic
 * @param textDocument
 */
const createQuickFixAction = (diagnostic: Diagnostic, textDocument: TextDocument) => {
	const textEdits: TextEdit[] = [TextEdit.replace(diagnostic.range, diagnostic.data)];
	const documentChanges = {
		documentChanges: [
			TextDocumentEdit.create(
				{
					uri: textDocument.uri,
					version: textDocument.version
				},
				textEdits,
			)
		],
	};

	const fixAction = CodeAction.create(
		"問題を自動修正する（" + APP_NAME + "）",
		documentChanges,
		CodeActionKind.QuickFix
	);

	// 作成したクイックフィックスのアクションを診断結果と紐付ける
	fixAction.diagnostics = [diagnostic];

	return fixAction;
};



// テキスト補完はサポートしない
// connection.onCompletion(
// 	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

// 		return [];
// 	}
// );
// connection.onCompletionResolve(
// 	(item: CompletionItem): CompletionItem => {
// 		if (item.data === 1) {
// 			item.detail = 'TypeScript details';
// 			item.documentation = 'TypeScript documentation';
// 		} else if (item.data === 2) {
// 			item.detail = 'JavaScript details';
// 			item.documentation = 'JavaScript documentation';
// 		}
// 		return item;
// 	}
// );

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
