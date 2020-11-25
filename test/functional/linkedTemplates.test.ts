// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import * as assert from "assert";
import { Uri } from "vscode";
import { ExpectedDiagnostics, testDiagnostics, testDiagnosticsFromUri } from "../support/diagnostics";
import { resolveInTestFolder } from "../support/resolveInTestFolder";
import { testWithLanguageServerAndRealFunctionMetadata } from "../support/testWithLanguageServer";

suite("Linked templates functional tests", () => {
    function createLinkedTemplateTest(
        testName: string,
        options: {
            //mainTemplateContents?: Partial<IDeploymentTemplate>;
            mainTemplateFile?: string;
            //mainParametersContents?: string;
            mainParametersFile?: string;
            mainTemplateExpected: ExpectedDiagnostics;
            linkedTemplates: {
                linkedTemplateFile: string;
                expected: ExpectedDiagnostics;
            }[];
        }
    ): void {
        testWithLanguageServerAndRealFunctionMetadata(
            testName,
            async () => {
                const templateContentsOrFilename = options.mainTemplateFile;
                assert(templateContentsOrFilename);
                assert(options.mainParametersFile);

                // Open and test diagnostics for the main template file
                await testDiagnostics(
                    templateContentsOrFilename,
                    {
                        parametersFile: templateContentsOrFilename
                    },
                    options.mainTemplateExpected
                );

                // Test diagnostics (without opening them directly - that should have happened automatically) for the linked templates
                for (const linkedTemplate of options.linkedTemplates) {
                    const childUri = Uri.file(resolveInTestFolder(linkedTemplate.linkedTemplateFile));
                    await testDiagnosticsFromUri(
                        childUri,
                        {},
                        linkedTemplate.expected
                    );
                }
            });
    }

    createLinkedTemplateTest(
        "tc01 one level, no validation errors, child in subfolder",
        {
            mainTemplateFile: "templates/linkedTemplates/tc01/main.json",
            mainParametersFile: "main.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema))'
            ],
            linkedTemplates: [
                {
                    linkedTemplateFile: "templates/linkedTemplates/tc01/subfolder/child.json",
                    expected: [
                        "Error: Undefined parameter reference: 'p3string-whoops' (arm-template (expressions))"
                    ]
                }
            ]
        }
    );

});
