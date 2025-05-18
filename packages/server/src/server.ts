import * as path from "path";
import { TextlintMessage, TextlintResult } from "@textlint/kernel";
import { createLinter, loadTextlintrc } from "textlint";
import { configPath } from "textlint-rule-preset-icsmedia";
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	TextDocumentEdit,
	TextEdit,
	Position,
	Range,
	CodeActionKind,
	CodeAction,
	CodeActionParams,
} from 'vscode-languageserver/node';
import { URI } from "vscode-uri";
import HTMLPlugin from "textlint-plugin-html";
import LatexPlugin from "textlint-plugin-latex2e";
import ReviewPlugin from "textlint-plugin-review";
import { DEFAULT_EXTENSION_RULES } from "./rules/rule";

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { APP_NAME, APP_ID } from '@custom-japanese-proofreading/common';

// NodeのIPCを使用してサーバーの接続を作成
// プレビュー/提案されたすべてのLSP機能を含む
const connection = createConnection(ProposedFeatures.all);

// テキストドキュメントを管理するクラスを作成します。
const documents = new TextDocuments<TextDocument>(TextDocument);

let hasConfigurationCapability = false;
// TODO: 理解してもしかしたらコメント解除
// let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// クライアントが `workspace/configuration` リクエストをサポートしているか
	// サポートしていない場合は、グローバル設定を使用
	hasConfigurationCapability = !!(
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
	// TODO: 意味を知ってもしかしたらコメント解除
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
	if (hasConfigurationCapability) {
		// すべての設定変更を登録
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	// TODO: 意味を知ってもしかしたらコメント解除
	// if (hasWorkspaceFolderCapability) {
	// 	connection.workspace.onDidChangeWorkspaceFolders(_event => {
	// 		connection.console.log('Workspace folder change event received.');
	// 	});
	// }
});

const getDefaultTextlintSettings = () => {
	const mySettings: Record<string, boolean> = {};

	DEFAULT_EXTENSION_RULES.forEach((value) => {
		mySettings[value.ruleName] = value.enabled;
	});

	return mySettings;
};

/**
 * VSCode側の設定
 */
interface ITextlintSettings {
	/** 問題を表示する最大数 */
	maxNumberOfProblems: number;
	/**
	 * textlintの設定
	 * trueとなっているルールを適用します。
	 */
	textlint: Record<string, boolean>;
}

// `workspace/configuration` リクエストがサポートされていない場合に使用されるグローバル設定
// このサーバーをこの例で提供されるクライアントで使用する場合は当てはまりませんが、
// 他のクライアントで発生する可能性があります。
const defaultSettings: ITextlintSettings = {
	maxNumberOfProblems: 1000,
	textlint: getDefaultTextlintSettings(),
};
let globalSettings: ITextlintSettings = defaultSettings;

// すべてのドキュメントの設定をキャッシュ
const documentSettings = new Map<string, Thenable<ITextlintSettings>>();

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

connection.onDidChangeConfiguration((change) => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = (change.settings[APP_ID] ||
			defaultSettings) as ITextlintSettings;
	}

	// Revalidate all open text documents
	// TODO: もっと良い方法があるかも
	documents.all().forEach(validateTextDocument);
});

/**
 * VSCode側の設定を取得します。
 */
function getDocumentSettings(resource: string): Thenable<ITextlintSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: APP_ID,
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose((close) => {
	documentSettings.delete(close.document.uri);
	resetTextDocument(close.document);
});

// TODO: 理解してもしかしたらコメント解除
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
	validateTextDocument(change.document);
});

// バリデーション（textlint）を実施
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// TODO: Promise<Diagnostic[]> として診断結果を返す書き方もできるみたい
	// VSCode側の設定を取得
	const settings = await getDocumentSettings(textDocument.uri);

	const document = textDocument.getText();

	// ICS MEDIAのルールのtextlintの設定ファイルを読み込み
	const defaultDescriptor = await loadTextlintrc({
		configFilePath: configPath,
	});

	// デフォルトのプラグイン設定を取得。テキスト・マークダウン用のプラグインなどが入っている想定
	const defalutPluginSettings = defaultDescriptor.toKernelOptions().plugins;

	// 追加のプラグイン設定
	const extendPlugins = [
		{
			pluginId: "@textlint/textlint-plugin-html",
			plugin: HTMLPlugin,
		},
		{
			pluginId: "@textlint/textlint-plugin-latex2e",
			plugin: LatexPlugin,
		},
		{
			pluginId: "@textlint/textlint-plugin-review",
			plugin: ReviewPlugin,
		},
	];

	let descriptor;
	const diagnostics: Diagnostic[] = [];

	if (defalutPluginSettings) {
		descriptor = defaultDescriptor.shallowMerge({
			plugins: [...defalutPluginSettings, ...extendPlugins],
		});
	} else {
		descriptor = defaultDescriptor.shallowMerge({
			plugins: [...extendPlugins],
		});
	}

	// ファイルの拡張子
	const ext: string = path.extname(textDocument.uri);
	// サポートされている拡張子
	const targetExtension = descriptor.availableExtensions.find((i) => i === ext) ?? null;

	// 対応していない拡張子の場合、バリデーションを実行しない
	if (targetExtension === null) {
		return;
	}

	const linter = createLinter({
		descriptor,
	});
	const results: TextlintResult = await linter.lintText(
		document,
		URI.parse(textDocument.uri).fsPath,
	);

	// エラーが存在する場合
	if (results.messages.length) {
		// エラーメッセージ一覧を取得
		const messages: TextlintMessage[] = results.messages;
		const l: number = messages.length;
		for (let i = 0; i < l; i++) {
			const message: TextlintMessage = messages[i];
			const text = `${message.message}（${message.ruleId}）`;

			// 有効とされているエラーか？
			if (!isTarget(settings, message.ruleId, message.message)) {
				continue;
			}

			// エラー範囲の開始位置のズレ
			let startCharacterDiff = 0;

			// エラーのルールが「不自然な濁点」か？
			const isRuleNoNfd = message.ruleId === "japanese/no-nfd";
			if (isRuleNoNfd) {
				// ルール「不自然な濁点」は、修正テキストを1文字ずらして生成していると思われるため、エラー開始位置も1文字ずらしたい
				startCharacterDiff = -1;
			}

			// エラーの文字数を取得します。
			// 文字数が存在しない場合の値は1になります。
			const posRange = message.fix?.range
				? message.fix.range[1] - message.fix.range[0]
				: 1;
			// エラーの開始位置を取得します。
			const startPos = Position.create(
				Math.max(0, message.loc.start.line - 1),
				Math.max(0, message.loc.start.column - 1 + startCharacterDiff),
			);
			// エラーの終了位置を取得します。
			const endPos = Position.create(
				Math.max(0, message.loc.end.line - 1),
				Math.max(0, message.loc.start.column - 1 + startCharacterDiff + posRange),
			);
			const canAutofixMessage = message.fix ? "🪄 " : "";
			// 診断結果を作成
			const diagnostic: Diagnostic = {
				severity: toDiagnosticSeverity(message.severity),
				range: Range.create(startPos, endPos),
				message: canAutofixMessage + text,
				source: APP_NAME,
				code: message.ruleId,
				data: message.fix?.text,
			};
			diagnostics.push(diagnostic);
		}
	}
	// 診断結果をVSCodeに送信し、ユーザーインターフェースに表示します。
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// モニターしているファイルに変更があった場合
	connection.console.log('ファイルの変更通知を受信');
});

/**
 * 設定で有効としているエラーかどうか判定します。
 * @param settings VSCode側の設定
 * @param targetRuleId エラーのルールID
 * @param message エラーメッセージ
 * @returns
 */
const isTarget = (
	settings: ITextlintSettings,
	targetRuleId: string,
	message: string,
): boolean => {
	let bool = false;
	DEFAULT_EXTENSION_RULES.forEach((rule) => {
		if (targetRuleId === "prh") {
			// prhのルールの場合

			// ruleIdからprh内の細かいルールを取得できないのでmessageに含まれているか取得している
			const ruleIdSub = rule.ruleId.split("/")[1];
			if (message.includes(`（${ruleIdSub}）`)) {
				// VSCodeの設定に存在しないルールは、デフォルト設定を使用します。
				bool = settings.textlint[rule.ruleName] ?? rule.enabled;
			}
		} else if (rule.ruleId.includes(targetRuleId)) {
			// 使用するルールのIDとエラーのルールIDが一致する場合

			// VSCodeの設定に存在しないルールは、デフォルト設定を使用します。
			// 例: ですます調、jtf-style/1.2.2
			bool = settings.textlint[rule.ruleName] ?? rule.enabled;
		}
	});
	return bool;
};

/**
 * validate済みの内容を破棄します。
 * @param textDocument
 */
const resetTextDocument = async (textDocument: TextDocument): Promise<void> => {
	const diagnostics: Diagnostic[] = [];
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
};

const toDiagnosticSeverity = (severity: number) => {
	switch (severity) {
		case 0:
			return DiagnosticSeverity.Information;
		case 1:
			return DiagnosticSeverity.Warning;
		case 2:
			return DiagnosticSeverity.Error;
	}
	return DiagnosticSeverity.Information;
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
