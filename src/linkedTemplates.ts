// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as path from 'path';
import { ProgressLocation, Uri, window, workspace } from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from "vscode-azureextensionui";
import { ext } from "./extensionVariables";
import { assert } from './fixed_assert';

export interface IRequestOpenLinkedFileArgs {
    sourceTemplateUri: string;
    requestedLinkUri: string;
    requestedLinkResolvedUri: string;
    //requestId: string;
    //asdfrequestedLinkResolvedUriWithId: string;
}

export interface IRequestOpenLinkedFileReturn {
    errorMessage: string;
}

//asdf
// enum PathType {
//     templateLink = 0,
//     templateRelativeLink = 1,
//     parametersLink = 2,
// }

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
export async function onRequestOpenLinkedFile({ sourceTemplateUri, requestedLinkResolvedUri }: IRequestOpenLinkedFileArgs): Promise<string | undefined> { //asdf returns error message
    //asdf do we try to keep this file around for a while???

    //asdf what return?
    return await callWithTelemetryAndErrorHandling('tryOpenLinkedFile', async (context: IActionContext) => { //asdf error handling
        context.telemetry.properties.openResult = 'Failed';
        context.telemetry.properties.openErrorType = '';

        // e.g. 'https://fake/public-ip.json?link%3D0'
        //asdf const contextId: string | undefined = (requestedLinkResolvedUriWithId.match(/link%3d([0-9]+$)/i) ?? [])[1]; //asdf

        //asdf how properly handle paths like /proj/c#/file.txt?
        const sourceTemplatePathAsUri: Uri = Uri.parse(sourceTemplateUri, true); //asdf? what if not file:// ?
        const requestedLinkPathAsUri: Uri = Uri.parse(requestedLinkResolvedUri, true); //asdf? what if not file:// ?   // e.g. 'file:///Users/stephenweatherford/repos/vscode-azurearmtools/test/templates/linkedTemplates/parent-child//linkedTemplates/linkedTemplate.json?linked=%2FUsers%2Fstephenweatherford%2Frepos%2Fvscode-azurearmtools%2Ftest%2Ftemplates%2FlinkedTemplates%2Fparent-child%2FmainTemplate.json'

        assert(path.isAbsolute(sourceTemplatePathAsUri.fsPath), "Internal error: sourceTemplateUri should be an absolute path");
        assert(path.isAbsolute(requestedLinkPathAsUri.fsPath), "Internal error: requestedLinkUri should be an absolute path");

        // const uri = Uri.parse(requestedLinkResolvedUriWithId); //asdf (= converted to %3D)
        const uri = requestedLinkPathAsUri;
        ext.outputChannel.appendLine(`Opening linked file "${uri}" in editor (linked from "${sourceTemplatePathAsUri.fsPath}")`);

        //asdf what if get multiple requests immediately?  do we care?
        const loadError = await tryOpenLinkedFile(uri);
        if (loadError === undefined) {
            context.telemetry.properties.openResult = 'Success';
        } else {
            const parsedError = parseError(loadError);
            context.telemetry.properties.openErrorType = parsedError.errorType;
            return parsedError.message;
        }
    });

}

// asdf what if file can't be loaded?  When do we try again?

export async function onNotifyTemplateGraph(args: INotifyTemplateGraphArgs): Promise<void> {
    ext.outputChannel.appendLine(`onNotifyTemplateGraph:`); //asdf
    ext.outputChannel.appendLog(JSON.stringify(args, undefined, 4));
}

type PossibleError = { message?: string } | unknown;

/**
 * Attempts to load the given file into a text document in VS Code so that
 * it will get sent to the language server.
 */
async function tryOpenLinkedFile(uri: Uri): Promise<PossibleError | undefined> {
    //asdf
    //await callWithTelemetryAndErrorHandling('tryLoadLinkedFile', async (actionContext: IActionContext) => { //asdf error handling
    return await window.withProgress<PossibleError | undefined>(//asdf?
        {
            location: ProgressLocation.Window,
            title: `Loading linked file ${uri.fsPath}`
        },
        async (): Promise<PossibleError | undefined> => {
            // Note: If the URI is already opened, returns the existing document
            // tslint:disable-next-line: prefer-template
            //uri = Uri.parse(uri.fsPath + "?a");

            try {
                const doc = await workspace.openTextDocument(uri);
                // tslint:disable-next-line: no-console asdf
                console.log(`... Opened: ${doc.uri}`);
            } catch (err) {
                ext.outputChannel.appendLine(`... Failed loading ${uri.fsPath}: ${parseError(err).message}`);
                return err; //asdf what UI experience? put in error list?  asdf wrap error
            }

            ext.outputChannel.appendLine(`... Succeeded loading (or is already loaded) ${uri}`); //asdf
            //asdf await window.showTextDocument(doc);

            // No errors
            return undefined;
        }
        //asdf What if it's JSON?  Will auto language switch kick in?
    );

}
