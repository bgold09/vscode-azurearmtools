// ---------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.md in the project root for license information.
// ---------------------------------------------------------------------------------------------

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
