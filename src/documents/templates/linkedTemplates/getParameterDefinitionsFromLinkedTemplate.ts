// ---------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.md in the project root for license information.
// ---------------------------------------------------------------------------------------------

import { Uri } from "vscode";
import { ILinkedTemplateReference } from "../../../ILinkedTemplateReference";
import { NormalizedMap } from "../../../util/NormalizedMap";
import { IParameterDefinition } from "../../parameters/IParameterDefinition";
import { DeploymentTemplateDoc } from "../DeploymentTemplateDoc";

//asdf cache?
//asdf
export function getParameterDefinitionsFromLinkedTemplate(
    linkedTemplate: ILinkedTemplateReference,
    loadedTemplates: NormalizedMap<Uri, DeploymentTemplateDoc>
): IParameterDefinition[] {
    //asdf const result = await tryOpenLinkedFile/*asdf*/(linkedTemplate.fullUri, PathType.templateRelativeLink/*asdf*/);
    const dt = loadedTemplates.get(Uri.parse(linkedTemplate.fullUri, true)); //asdf
    if (dt) {
        return dt.topLevelScope.parameterDefinitions;
    }

    return [];
}

//asdf
// export async function getParameterValuesSourceFromLinkedTemplate(linkedTemplate: ILinkedTemplateReference): Promise<IParameterValuesSource | undefined> {
//     const result = await tryOpenLinkedFile/*asdf*/(linkedTemplate.fullUri, PathType.templateRelativeLink/*asdf*/);
//     if (result.document) {
//         const templateContent = result.document?.getText();
//         return new DeploymentParametersDoc(templateContent, result.document.uri).parameterValuesSource;
//     }

//     return undefined;
// }
