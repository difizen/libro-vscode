import { ExtensionContext, window, workspace } from "vscode";
import { setExtension } from "./ctx";
import * as vscode from 'vscode';
import { LibroNotebookEditorProvider } from "./libro-editor-provider";

class LibroExtension {
	private extension: ExtensionContext;
	constructor(extension: ExtensionContext) {
		this.extension = extension;
	}
	public async activate() {
		setExtension(this.extension);
		this.registerCommands();
		this.extension.subscriptions.push(LibroNotebookEditorProvider.register(this.extension));
	}

	private registerCommands() {
	}
}

export async function activate(extension: ExtensionContext) {
	const libroExtension = new LibroExtension(extension);
	await libroExtension.activate();
}
  
export async function deactivate() {

}
