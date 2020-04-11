// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as path from 'path';
import { ProgressLocation, Uri, window, workspace } from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext, parseError, TelemetryProperties } from "vscode-azureextensionui";
import { ext } from "./extensionVariables";
import { assert } from './fixed_assert';
import { pathExists } from './util/pathExists';

/**
 * Inputs for RequestOpenLinkedFile request sent from language server
 */
export interface IRequestOpenLinkedFileArgs {
    sourceTemplateUri: string;
    requestedLinkOriginalUri: string;
    requestedLinkResolvedUri: string;
    pathType: PathType;
}

/**
 * Response sent back to language server from RequestOpenLinkedFile request
 */
export interface IRequestOpenLinkedFileReturn {
    loadErrorMessage: string;
}

// Defined in the validation assembly used by the language server
enum PathType {
    templateLink = 0,
    templateRelativeLink = 1,
    parametersLink = 2,
}

interface ILinkedTemplate {
    id: string; // Guid
    fullPath: Uri;
    lineNumber: number;
    columnNumber: number;
    //asdf pathType: PathType;
    parameters: { [key: string]: unknown };
    //asdf parentContext: ILinkedTemplateContext;
}

// tslint:disable-next-line: no-empty-interface asdf
export interface INotifyTemplateGraphArgs {
    rootTemplateUri: Uri;
    linkedTemplates: ILinkedTemplate[];
}

/**
 * Handles a request from the language server to open a linked template
 * @param sourceTemplateUri The full URI of the template which contains the link
 * @param requestedLinkPath The full URI of the resolved link being requested
 */
export async function onRequestOpenLinkedFile({ sourceTemplateUri, requestedLinkResolvedUri, pathType }: IRequestOpenLinkedFileArgs): Promise<string | undefined> { //asdf returns error message
    //asdf do we try to keep this file around for a while???

    //asdf what return?
    return await callWithTelemetryAndErrorHandling('tryOpenLinkedFile', async (context: IActionContext) => { //asdf error handling
        const properties = <TelemetryProperties & {
            openResult: 'Loaded' | 'Error';
            openErrorType: string;
        }>context.telemetry.properties;
        properties.openErrorType = '';
        properties.openResult = 'Error';

        //asdf how properly handle paths like /proj/c#/file.txt?
        const sourceTemplatePathParsed: Uri = Uri.parse(sourceTemplateUri, true); //asdf? what if not file:// ?
        const requestedLinkResolvedPathParsed: Uri = Uri.parse(requestedLinkResolvedUri, true); //asdf? what if not file:// ?

        assert(path.isAbsolute(sourceTemplatePathParsed.fsPath), "Internal error: sourceTemplateUri should be an absolute path");
        assert(path.isAbsolute(requestedLinkResolvedPathParsed.fsPath), "Internal error: requestedLinkUri should be an absolute path");

        // Strip the path of any query string, and use only the local file path
        const localPath = requestedLinkResolvedPathParsed.fsPath;
        const loadError = await tryOpenLinkedFile(localPath, pathType);
        if (loadError === undefined) {
            properties.openResult = 'Loaded';
        } else {
            const parsedError = parseError(loadError);
            properties.openErrorType = parsedError.errorType;
            return parsedError.message;
        }
    });

}

// asdf what if file can't be loaded?  When do we try again?

export async function onNotifyTemplateGraph(args: INotifyTemplateGraphArgs): Promise<void> {
    ext.outputChannel.appendLine(`onNotifyTemplateGraph:`); //asdf
    ext.outputChannel.appendLog(JSON.stringify(args, undefined, 4));
}

type PossibleError = Partial<Error>; //asdf move

/**
 * Attempts to load the given file into a text document in VS Code so that
 * it will get sent to the language server.
 */
async function tryOpenLinkedFile(localPath: string, pathType: PathType): Promise<PossibleError | undefined> {
    //asdf
    //await callWithTelemetryAndErrorHandling('tryLoadLinkedFile', async (actionContext: IActionContext) => { //asdf error handling
    return await window.withProgress<PossibleError | undefined>(//asdf?
        {
            location: ProgressLocation.Window,
            title: `Loading linked file ${localPath}`
        },
        async (): Promise<PossibleError | undefined> => {
            try {
                // Check first if the path exists, so we get a better error message if not
                if (!(await pathExists(localPath))) {
                    return <PossibleError>{
                        message:
                            pathType === PathType.parametersLink ?
                                `Could not find linked parameter file "${localPath}"` :
                                `Could not find linked template file "${localPath}"`,
                        errorCode: "NotFound"
                    };
                }

                // Load into a text document (this does not cause the document to be shown)
                // Note: If the URI is already opened, this returns the existing document
                const doc = await workspace.openTextDocument(localPath);
                // tslint:disable-next-line: no-console asdf
                console.log(`... Opened: ${doc.uri}`);
                ext.outputChannel.appendLine(`... Opened linked file ${localPath}`);

                // No errors
                return undefined;
            } catch (err) {
                ext.outputChannel.appendLine(`... Failed loading ${localPath}: ${parseError(err).message}`);
                return <PossibleError>err; //asdf what UI experience? put in error list?  asdf wrap error
            }
        }
    );

}
