//asdf move to documents/
// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as path from 'path';
import { TextDocument, Uri, workspace } from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext, parseError, TelemetryProperties } from "vscode-azureextensionui";
import { DeploymentTemplateDoc } from './documents/templates/DeploymentTemplateDoc';
import { LinkedTemplateScope } from './documents/templates/scopes/templateScopes';
import { Errorish } from './Errorish';
import { ext } from "./extensionVariables";
import { assert } from './fixed_assert';
import { ILinkedTemplateReference } from './ILinkedTemplateReference';
import { ContainsBehavior } from "./language/Span";
import { NormalizedMap } from './util/NormalizedMap';
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

export interface INotifyTemplateGraphArgs {
    rootTemplateUri: string;
    linkedTemplates: ILinkedTemplateReference[];
    fullValidationEnabled: boolean;
}

/**
 * Handles a request from the language server to open a linked template
 * @param sourceTemplateUri The full URI of the template which contains the link
 * @param requestedLinkPath The full URI of the resolved link being requested
 */
export async function onRequestOpenLinkedFile({ sourceTemplateUri, requestedLinkResolvedUri, pathType }: IRequestOpenLinkedFileArgs): Promise<IRequestOpenLinkedFileResult | undefined> {
    return await callWithTelemetryAndErrorHandling<IRequestOpenLinkedFileResult>('onRequestOpenLinkedFile', async (context: IActionContext) => { //asdf error handling
        // const properties = <TelemetryProperties & {
        //     openResult: 'Loaded' | 'Error';
        //     openErrorType: string;
        // }>context.telemetry.properties;
        // properties.openErrorType = '';
        // properties.openResult = 'Error';

        const result = await tryOpenLinkedFile(requestedLinkResolvedUri, pathType);
        return { loadErrorMessage: result.loadError ? parseError(result.loadError).message : undefined };

        //asdf
        // if (result.document) {
        //     properties.openResult = 'Loaded';
        // } else {
        //     const parsedError = parseError(loadError);
        //     properties.openErrorType = parsedError.errorType;
        //     return {
        //         loadErrorMessage: parsedError.message
        //     };
        // }

        // return {
        //     loadErrorMessage: undefined
        // };
    });
}

type OpenLinkedFileResult = { document: TextDocument; loadError?: Errorish } | { document?: TextDocument; loadError: Errorish }; //asdf

export async function tryOpenLinkedFile(
    //asdf  sourceTemplateUriAsString: string,
    requestedLinkResolvedUriAsString: string,
    pathType: PathType
): Promise<OpenLinkedFileResult> {
    return <OpenLinkedFileResult>await callWithTelemetryAndErrorHandling<OpenLinkedFileResult>('tryOpenLinkedFile'/*asdf*/, async (context: IActionContext) => { //asdf error handling
        //context.telemetry.suppressIfSuccessful = true; //asdf?

        const properties = <TelemetryProperties & {
            openResult: 'Loaded' | 'Error';
            openErrorType: string;
        }>context.telemetry.properties;
        properties.openErrorType = '';
        properties.openResult = 'Error';

        //asdf const sourceTemplatePathParsed: Uri = Uri.parse(sourceTemplateUriAsString, true);
        const requestedLinkResolvedPathParsed: Uri = Uri.parse(requestedLinkResolvedUriAsString, true);

        //asdf assert(path.isAbsolute(sourceTemplatePathParsed.fsPath), "Internal error: sourceTemplateUri should be an absolute path");
        assert(path.isAbsolute(requestedLinkResolvedPathParsed.fsPath), "Internal error: requestedLinkUri should be an absolute path");

        // Strip the path of any query string, and use only the local file path
        const localPath = requestedLinkResolvedPathParsed.fsPath;

        const result = await tryOpenLinkedFile2(localPath, pathType);
        if (result.document) {
            properties.openResult = 'Loaded';
        } else {
            const parsedError = parseError(result.loadError);
            properties.openErrorType = parsedError.errorType;
        }

        return result;
    });
}

class LinkedTemplatePathNotFoundError extends Error { //asdf how does this look in telemetry?
    public constructor(message: string) {
        super(message);
    }
}

/**
 * Attempts to load the given file into a text document in VS Code so that
 * it will get sent to the language server.
 * <remarks>This function should not throw
 */
async function tryOpenLinkedFile2(
    localPath: string,
    pathType: PathType
): Promise<OpenLinkedFileResult> {
    try {
        // Check first if the path exists, so we get a better error message if not
        if (!(await pathExists(localPath))) {
            return {
                loadError: <Errorish>new LinkedTemplatePathNotFoundError(
                    pathType === PathType.parametersLink ?
                        `Could not find linked parameter file "${localPath}"` :
                        `Could not find linked template file "${localPath}"`
                )
            };
        }

        // Load into a text document (this does not cause the document to be shown)
        // Note: If the URI is already opened, this returns the existing document
        const document = await workspace.openTextDocument(localPath);
        // tslint:disable-next-line: no-console asdf
        console.log(`... Opened: ${document.uri}`);
        ext.outputChannel.appendLine(`... Opened linked file ${localPath}`);

        // No errors
        return { document };
    } catch (err) {
        ext.outputChannel.appendLine(`... Failed loading ${localPath}: ${parseError(err).message}`);
        return { loadError: <Errorish>err }; //asdf what UI experience? put in error list?  asdf wrap error?
    }
}

//asdf doc
//asdf instead, provide a way for the template to fetch this?
export function assignTemplateGraphToDeploymentTemplate(
    graph: INotifyTemplateGraphArgs,
    dt: DeploymentTemplateDoc,
    loadedTemplates: NormalizedMap<Uri, DeploymentTemplateDoc>
): void { //asdf this is called a lot of times
    assert(normalizePath(Uri.parse(graph.rootTemplateUri)) === normalizePath(dt.documentUri));

    //asdf reentrancy - precalculate?  No need to set param values source multiple times for COPY loop

    // Clear current
    const linkedScopes = ofType(dt.allScopes, LinkedTemplateScope);
    // for (const linkedScope of linkedScopes) {
    //     //asdf await linkedScope.setLinkedFileReferences(undefined);
    // }

    for (const linkReference of graph.linkedTemplates) {
        const linkPositionInTemplate = dt.getDocumentCharacterIndex(linkReference.lineNumberInParent, linkReference.lineNumberInParent);

        // Since templated deployments can't have children (in the defining document), there can be at most linked deployment scopes whose defining
        //   resource contains the location
        const matchingScope = linkedScopes.find(scope => scope.owningDeploymentResource.span.contains(linkPositionInTemplate, ContainsBehavior.enclosed));
        if (matchingScope) {
            //asdf reentrancy - precalculate?  No need to set param values source multiple times for COPY loop
            //matchingScope.linkedFileReferences?.push(linkReference);
            matchingScope.setLinkedFileReferences([linkReference], loadedTemplates);
        }

        //asdf
        // const pc = dt.getContextFromDocumentLineAndColumnIndexes(linkReference.lineNumberInParent, linkReference.columnNumberInParent, undefined, true);
        // const enclosingResource = pc.getEnclosingResource();
        // if (enclosingResource) {
        //     if (enclosingResource.getPropertyValue(templateKeys.resourceType)?.asStringValue?.unquotedValue.toLowerCase() === deploymentsResourceTypeLC) {
        //         // It's a deployment resource - get the "templateLink" object, that's the root object of any linked template deployment
        //         const templateLinkObjectValue = enclosingResource
        //             .getPropertyValue(templateKeys.properties)?.asObjectValue
        //             ?.getPropertyValue(templateKeys.linkedDeploymentTemplateLink)?.asObjectValue;
        //         const matchingScope = linkedScopes.find(scope => scope.rootObject === templateLinkObjectValue);
        //         if (matchingScope instanceof LinkedTemplateScope) {
        //             // Found it

        //             //asdf reentrancy - precalculate?  No need to set param values source multiple times for COPY loop
        //             //matchingScope.linkedFileReferences?.push(linkReference);
        //             matchingScope.setLinkedFileReferences([linkReference], loadedTemplates);
        //         }
        //     }
    }
}
