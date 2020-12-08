//asdf
// // ---------------------------------------------------------------------------------------------
// // Copyright (c) Microsoft Corporation. All rights reserved.
// // Licensed under the MIT License. See License.md in the project root for license information.
// // ---------------------------------------------------------------------------------------------

// import { ProgressLocation, window, workspace } from "vscode";
// import { parseError } from "vscode-azureextensionui";
// import { ext } from "./extensionVariables";
// import { PathType } from "./PathType";
// import { PossibleError } from './PossibleError';
// import { pathExists } from './util/pathExists';

// /**
//  * Attempts to load the given file into a text document in VS Code so that
//  * it will get sent to the language server.
//  */
// export async function tryOpenLinkedFile(localPath: string, pathType: PathType): Promise<PossibleError | undefined> {
//     try {
//         // Check first if the path exists, so we get a better error message if not
//         if (!(await pathExists(localPath))) {
//             return <PossibleError>{
//                 message: pathType === PathType.parametersLink ?
//                     `Could not find linked parameter file "${localPath}"` :
//                     `Could not find linked template file "${localPath}"`,
//                 errorCode: "NotFound"
//             };
//         }

//         // Load into a text document (this does not cause the document to be shown)
//         // Note: If the URI is already opened, this returns the existing document
//         const doc = await workspace.openTextDocument(localPath);
//         // tslint:disable-next-line: no-console asdf
//         console.log(`... Opened: ${doc.uri}`);
//         ext.outputChannel.appendLine(`... Opened linked file ${localPath}`);

//         // No errors
//         return undefined;
//     } catch (err) {
//         ext.outputChannel.appendLine(`... Failed loading ${localPath}: ${parseError(err).message}`);
//         return <PossibleError>err; //asdf what UI experience? put in error list?  asdf wrap error
//     }
// }
