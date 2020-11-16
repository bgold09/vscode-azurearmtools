// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as path from 'path';
import { ProgressLocation, Uri, window, workspace } from "vscode";
import { callWithTelemetryAndErrorHandling, parseError } from "vscode-azureextensionui";
import { ext } from "./extensionVariables";
import { assert } from './fixed_assert';

export interface IRequestOpenLinkedFileInputs {
    sourceTemplateUri: string;
    requestedLinkUri: string;
    requestedLinkResolvedUri: string;
    //requestId: string;
    requestedLinkResolvedUriWithId: string;
}

export interface IRequestOpenLinkedFileReturn {
    errorMessage: string;
}

export interface INotifyTemplateGraph {
    sourceTemplateUri: string;
    requestedLinkUri: string;
    requestedLinkResolvedUri: string;
    //requestId: string;
    requestedLinkResolvedUriWithId: string;
}

/**
 * Handles a request from the language server to open a linked template
 * @param sourceTemplateUri The full URI of the template which contains the link
 * @param requestedLinkPath The full URI of the resolved link being requested
 */
export async function onRequestOpenLinkedFile({ sourceTemplateUri, requestedLinkResolvedUri, requestedLinkResolvedUriWithId }: IRequestOpenLinkedFileInputs): Promise<string | undefined> { //asdf returns error message
    //asdf do we try to keep this file around for a while???

    //asdf what return?
    try {
        await callWithTelemetryAndErrorHandling('onRequetOpenLinkedFile', async () => { //asdf error handling

            // e.g. 'https://fake/public-ip.json?link%3D0'
            const contextId: string | undefined = (requestedLinkResolvedUriWithId.match(/link%3d([0-9]+$)/i) ?? [])[1]; //asdf

            //asdf how properly handle paths like /proj/c#/file.txt?
            const sourceTemplatePathAsUri: Uri = Uri.parse(sourceTemplateUri, true); //asdf? what if not file:// ?
            const requestedLinkPathAsUri: Uri = Uri.parse(requestedLinkResolvedUri, true); //asdf? what if not file:// ?   // e.g. 'file:///Users/stephenweatherford/repos/vscode-azurearmtools/test/templates/linkedTemplates/parent-child//linkedTemplates/linkedTemplate.json?linked=%2FUsers%2Fstephenweatherford%2Frepos%2Fvscode-azurearmtools%2Ftest%2Ftemplates%2FlinkedTemplates%2Fparent-child%2FmainTemplate.json'

            assert(path.isAbsolute(sourceTemplatePathAsUri.fsPath), "Internal error: sourceTemplateUri should be an absolute path");
            assert(path.isAbsolute(requestedLinkPathAsUri.fsPath), "Internal error: requestedLinkUri should be an absolute path");

            const uri = Uri.parse(requestedLinkResolvedUriWithId); //asdf (= converted to %3D)
            ext.outputChannel.appendLine(`Opening linked file "${uri}" in editor (linked from "${sourceTemplatePathAsUri.fsPath}")`);

            //asdf what if get multiple requests immediately?  do we care?
            // tslint:disable-next-line: no-floating-promises // Don't wait
            await tryLoadLinkedFile(uri);
        });

        // No error message to return
        return undefined;
    } catch (err) {
        return parseError(err).message; //asdf?
    }
}

// asdf what if file can't be loaded?  When do we try again?

/**
 * Attempts to load the given file into a text document in VS Code so that
 * it will get sent to the language server.
 */
export async function tryLoadLinkedFile(uri: Uri): Promise<void> {
    //asdf
    //await callWithTelemetryAndErrorHandling('tryLoadLinkedFile', async (actionContext: IActionContext) => { //asdf error handling
    try {
        await window.withProgress(//asdf?
            {
                location: ProgressLocation.Window,
                title: `Loading linked file ${uri.fsPath}`
            },
            async () => {
                // Note: If the URI is already opened, returns the existing document
                // tslint:disable-next-line: prefer-template
                //uri = Uri.parse(uri.fsPath + "?a");
                const doc = await workspace.openTextDocument(uri);
                // tslint:disable-next-line: no-console
                console.log(`... Opened: ${doc.uri}`);
                ext.outputChannel.appendLine(`... Succeeded loading (or is already loaded) ${uri}`); //asdf
                await window.showTextDocument(doc);
            });
        //asdf What if it's JSON?  Will auto language switch kick in?
    } catch (err) {
        ext.outputChannel.appendLine(`... Failed loading ${uri.fsPath}: ${parseError(err).message}`);
        throw new Error(parseError(err).message); //asdf what UI experience? put in error list?  asdf wrap error
    }
    //});
}
