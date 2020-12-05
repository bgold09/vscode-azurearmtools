// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as path from 'path';
import { ProgressLocation, Uri, window, workspace } from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext, parseError, TelemetryProperties } from "vscode-azureextensionui";
import { deploymentsResourceTypeLC, templateKeys } from './constants';
import { DeploymentTemplateDoc } from './documents/templates/DeploymentTemplateDoc';
import { LinkedTemplateScope } from './documents/templates/scopes/templateScopes';
import { ext } from "./extensionVariables";
import { assert } from './fixed_assert';
import { PossibleError } from './PossibleError';
import { normalizePath } from './util/normalizePath';
import { ofType } from './util/ofType';
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
export interface IRequestOpenLinkedFileResult {
    loadErrorMessage: string | undefined;
}

enum PathType {
    templateLink = 0,
    templateRelativeLink = 1,
    parametersLink = 2,
}

export enum LinkedFileLoadState {
    NotLoaded = 0,
    Loading = 1,
    SuccessfullyLoaded = 2,
    LoadFailed = 3,
    TooDeep = 4,
    NotSupported = 5,
}

export interface ILinkedTemplateReference {
    id: string; // Guid
    fullUri: string;
    originalPath: string;
    lineNumberInParent: number;
    columnNumberInParent: number;
    parameterValues: { [key: string]: unknown };
    loadState: LinkedFileLoadState;
    loadErrorMessage: string | undefined;
}

export interface INotifyTemplateGraphArgs {
    rootTemplateUri: string;
    linkedTemplates: ILinkedTemplateReference[];
}

/**
 * Handles a request from the language server to open a linked template
 * @param sourceTemplateUri The full URI of the template which contains the link
 * @param requestedLinkPath The full URI of the resolved link being requested
 */
export async function onRequestOpenLinkedFile({ sourceTemplateUri, requestedLinkResolvedUri, pathType }: IRequestOpenLinkedFileArgs): Promise<IRequestOpenLinkedFileResult | undefined> {
    return await callWithTelemetryAndErrorHandling<IRequestOpenLinkedFileResult>('tryOpenLinkedFile', async (context: IActionContext) => { //asdf error handling
        const properties = <TelemetryProperties & {
            openResult: 'Loaded' | 'Error';
            openErrorType: string;
        }>context.telemetry.properties;
        properties.openErrorType = '';
        properties.openResult = 'Error';

        const sourceTemplatePathParsed: Uri = Uri.parse(sourceTemplateUri, true);
        const requestedLinkResolvedPathParsed: Uri = Uri.parse(requestedLinkResolvedUri, true);

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
            return {
                loadErrorMessage: parsedError.message
            };
        }

        return {
            loadErrorMessage: undefined
        };
    });
}

/**
 * Attempts to load the given file into a text document in VS Code so that
 * it will get sent to the language server.
 */
async function tryOpenLinkedFile(localPath: string, pathType: PathType): Promise<PossibleError | undefined> {
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

//asdf doc
export function assignTemplateGraphToDeploymentTemplate(graph: INotifyTemplateGraphArgs, dt: DeploymentTemplateDoc): void { //asdf this is called a lot of times
    assert(normalizePath(Uri.parse(graph.rootTemplateUri)) === normalizePath(dt.documentUri));

    // Clear current
    const linkedScopes = ofType(dt.allScopes, LinkedTemplateScope);
    for (const linkedScope of linkedScopes) {
        linkedScope.linkedFileReferences = [];
    }

    for (const linkReference of graph.linkedTemplates) {
        const pc = dt.getContextFromDocumentLineAndColumnIndexes(linkReference.lineNumberInParent, linkReference.columnNumberInParent, undefined, true);
        const enclosingResource = pc.getEnclosingResource();
        if (enclosingResource) {
            if (enclosingResource.getPropertyValue(templateKeys.resourceType)?.asStringValue?.unquotedValue.toLowerCase() === deploymentsResourceTypeLC) {
                // It's a deployment resource - get the "templateLink" object, that's the root object of any linked template deployment
                const templateLinkObjectValue = enclosingResource
                    .getPropertyValue(templateKeys.properties)?.asObjectValue
                    ?.getPropertyValue(templateKeys.linkedDeploymentTemplateLink)?.asObjectValue;
                const matchingScope = linkedScopes.find(scope => scope.rootObject === templateLinkObjectValue);
                if (matchingScope instanceof LinkedTemplateScope) {
                    // Found it
                    matchingScope.linkedFileReferences?.push(linkReference);
                }
            }
        }
    }
}

