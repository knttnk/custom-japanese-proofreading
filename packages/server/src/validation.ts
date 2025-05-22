import * as path from "path";
import * as fs from "fs";
// textlint
import { TextlintMessage, TextlintResult } from "@textlint/kernel";
import {
	createLinter,
	loadTextlintrc
} from "textlint";
import { configPath as textlintPresetIcsmediaConfigPath } from "textlint-rule-preset-icsmedia";
import HTMLPlugin from "textlint-plugin-html";
import LatexPlugin from "textlint-plugin-latex2e";
import ReviewPlugin from "textlint-plugin-review";
// vscode
import {
	Diagnostic,
	DiagnosticSeverity,
	Position,
	Range,
} from 'vscode-languageserver/node';
import { URI } from "vscode-uri";
import { TextDocument } from 'vscode-languageserver-textdocument';
// その他
import debugModule from "debug";
debugModule.enable("textlint:loader:TextlintrcLoader");  // デフォルトでtextlintrcの読み込みエラーが表示されないので、強制的に表示するために追加
debugModule.enable("rc-config-loader");  // デフォルトでtextlintrcの読み込みエラーが表示されないので、強制的に表示するために追加
// TODO: 色がわかりにくいので、このモジュール以外の部分を色を変える。

// 自分
import { APP_ID, APP_NAME, UserSettings } from '@custom-japanese-proofreading/common';

// バリデーション（textlint）を実施
export async function validateTextDocument(
	textDocument: TextDocument,
	userSettings: UserSettings,
): Promise<Diagnostic[]> {
	const text: string = textDocument.getText();
	const diagnostics: Diagnostic[] = [];

	// 設定が存在しないときのデフォルト
	const settings = userSettings.getDocumentSettings(textDocument.uri);
	const userConfigPaths = settings.textlintrcPaths;
	for (let textlintrcIndex = 0; textlintrcIndex < userConfigPaths.length; textlintrcIndex++) {
		const userConfigPath = userConfigPaths[textlintrcIndex];
		let myDescriptor;
		if (userConfigPath === ":default:") {
			// デフォルトのtextlintrcを使用
			myDescriptor = await loadTextlintrc({
				configFilePath: textlintPresetIcsmediaConfigPath,
			});
			console.info(
				`[${APP_ID}]: Option using ${textlintPresetIcsmediaConfigPath}`,
			);
		} else {
			// ユーザ設定のtextlintrcファイルのパスを取得
			const textlintrcPath: string = path.resolve(userConfigPath);
			console.info(
				`[${APP_ID}]: textlintrcPath: ${textlintrcPath}`,
			);

			// 存在とファイルかを確認。でなければデフォルトのtextlintrcを使用
			if (!fs.existsSync(textlintrcPath)) {
				console.error(
					`[${APP_ID}]: textlintrcPath is not found. ${textlintrcPath}`,
				);
				continue;
			} else if (!fs.statSync(textlintrcPath).isFile()) {
				console.error(
					`[${APP_ID}]: textlintrcPath is not a file. ${textlintrcPath}`,
				);
				continue;
			}

			// textlintrcの内容を取得
			// TODO: バグの原因がユーザに伝えられない
			myDescriptor = await loadTextlintrc({
				configFilePath: textlintrcPath,
			});
			// デフォルトと一緒なら、なにもしない
			if (myDescriptor.rule.allDescriptors.length === 0) {
				console.error(`[${APP_ID}]: Possibly failed to load textlintrc file ${textlintrcPath}`);
			}
		}

		// デフォルトのプラグイン設定を取得。テキスト・マークダウン用のプラグインなどが入っている想定	
		const myPluginSettings = myDescriptor.toKernelOptions().plugins;

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

		if (myPluginSettings) {
			myDescriptor = myDescriptor.shallowMerge({
				plugins: [...myPluginSettings, ...extendPlugins],
			});
		} else {
			myDescriptor = myDescriptor.shallowMerge({
				plugins: [...extendPlugins],
			});
		}

		// ファイルの拡張子
		const ext: string = path.extname(textDocument.uri);
		// サポートされている拡張子
		const targetExtension = myDescriptor.availableExtensions.find((i) => i === ext) ?? null;

		// 対応していない拡張子の場合、バリデーションを実行しない
		if (targetExtension === null) {
			continue;
		}

		const linter = createLinter({
			descriptor: myDescriptor,
		});
		const results: TextlintResult = await linter.lintText(
			text,
			URI.parse(textDocument.uri).fsPath,
		);

		// エラーが存在する場合
		if (results.messages.length) {
			// エラーメッセージ一覧を取得
			const messages: TextlintMessage[] = results.messages;
			const l: number = messages.length;
			for (let i = 0; i < l; i++) {
				const message: TextlintMessage = messages[i];

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
				const canAutofixMessage = message.fix ? "🪄✨ " : "";
				// 診断結果を作成
				const diagnostic: Diagnostic = {
					severity: toDiagnosticSeverity(message.severity),
					range: Range.create(startPos, endPos),
					message: canAutofixMessage + message.message,
					source: `${APP_NAME} (設定ファイル${textlintrcIndex + 1})`,
					code: `rule: ${message.ruleId}`,
					data: message.fix?.text,
				};
				diagnostics.push(diagnostic);
			}
		}
	}

	return diagnostics;
}

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
