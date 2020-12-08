// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { IJsonDocument } from "../templates/IJsonDocument";
import { IParameterDefinition } from "./IParameterDefinition";

/**
 * Represents a "parameters" JSON object in a deployment template
 * which contains parameter definitions for a template file or
 * linked/nested template
 */
export interface IParameterDefinitionsSource {
    /**
     * The document containing the parameter definitions
     */
    document: IJsonDocument;

    parameterDefinitions: IParameterDefinition[];
}
