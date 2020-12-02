// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import * as assert from "assert";
import { Uri } from "vscode";
import { ExpectedDiagnostics, IExpectedDiagnostic, testDiagnostics, testDiagnosticsFromUri } from "../support/diagnostics";
import { resolveInTestFolder } from "../support/resolveInTestFolder";
import { testWithLanguageServerAndRealFunctionMetadata } from "../support/testWithLanguageServer";

suite("Linked templates functional tests", () => {
    // <TC> in strings will be replaced with ${testCase}
    function tcString(s: string, testCase: string): string {
        return s.replace(/<TC>/g, testCase);
    }

    // <TC> in strings will be replaced with ${testCase}
    function tcDiagnostics(ed: ExpectedDiagnostics, testCase: string): ExpectedDiagnostics {
        if (ed.length === 0) {
            return [];
        } else if (typeof ed[0] === 'string') {
            return (<string[]>ed).map((s: string) => tcString(<string>s, testCase));
        } else {
            return (<IExpectedDiagnostic[]>ed).map((d: IExpectedDiagnostic) => {
                const d2 = Object.assign({}, d, { message: tcString(d.message, testCase) });
                return d2;
            });
        }
    }

    // <TC> in strings will be replaced with ${testCase}
    function createLinkedTemplateTest(
        testCase: string,
        testDescription: string,
        options: {
            //mainTemplateContents?: Partial<IDeploymentTemplate>;
            mainTemplateFile: string;
            //mainParametersContents?: string;
            mainParametersFile: string;
            mainTemplateExpected: ExpectedDiagnostics;
            // If specified, wait for a diagnostic to match the following substring between continuing with checks
            waitForDiagnosticSubstring?: string;

            linkedTemplates: {
                linkedTemplateFile: string;
                expected: ExpectedDiagnostics;
            }[];
        }
    ): void {
        testWithLanguageServerAndRealFunctionMetadata(
            `${testCase} ${testDescription}`,
            async () => {
                const templateContentsOrFilename = options.mainTemplateFile;
                assert(templateContentsOrFilename);
                assert(options.mainParametersFile);

                // Open and test diagnostics for the main template file
                await testDiagnostics(
                    tcString(templateContentsOrFilename, testCase),
                    {
                        parametersFile: tcString(templateContentsOrFilename, testCase),
                        waitForDiagnosticSubstring: options.waitForDiagnosticSubstring,
                    },
                    tcDiagnostics(options.mainTemplateExpected, testCase)
                );

                // Test diagnostics (without opening them directly - that should have happened automatically) for the linked templates
                for (const linkedTemplate of options.linkedTemplates) {
                    const childUri = Uri.file(resolveInTestFolder(tcString(linkedTemplate.linkedTemplateFile, testCase)));
                    await testDiagnosticsFromUri(
                        childUri,
                        {
                        },
                        tcDiagnostics(linkedTemplate.expected, testCase)
                    );
                }
            });
    }

    // asdf timing out?
    createLinkedTemplateTest(
        "tc01",
        "one level, no validation errors, child in subfolder, relative path starts with subfolder name",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [16,17]'
            ],
            linkedTemplates: [
                {
                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
                    expected: [
                        "Error: Undefined parameter reference: 'p3string-whoops' (arm-template (expressions)) [26,38]"
                    ]
                }
            ]
        }
    );

    createLinkedTemplateTest(
        "tc02",
        "error: child not found",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            waitForDiagnosticSubstring: 'Could not find linked template file',
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [14,17]',

                `Error: Template validation: Could not find linked template file `
                + `"${resolveInTestFolder('templates/linkedTemplates/<TC>/subfolder/child.json')}"`
                + ` (arm-template (validation)) [12,27]`
            ],
            linkedTemplates: [
            ]
        }
    );

    createLinkedTemplateTest(
        "tc03",
        "one level, no validation errors, child in subfolder, relative path starts with ./",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [16,17]'
            ],
            linkedTemplates: [
                {

                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
                    expected: [
                        "Error: Undefined parameter reference: 'p3string-whoops' (arm-template (expressions)) [26,38]"
                    ]
                }
            ]
        }
    );

    // tslint:disable-next-line: no-suspicious-comment
    /* TODO: slow because showing two diagnostics groups asdf
    createLinkedTemplateTest(
        "tc04",
        "one level, no validation errors, child in subfolder, folder and filename contain spaces",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC> with spaces.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [15,16-15,30]'

            ],
            linkedTemplates: [
                {

                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder with spaces/child with spaces.json",
                    expected: [
                        "Error: Undefined parameter reference: 'p3string-whoops' (arm-template (expressions)) [26,38]"
                    ]
                }
            ]
        }
    );*/

    // tslint:disable-next-line: no-suspicious-comment
    /* TODO: Can't deploy to test yet
    createLinkedTemplateTest(
        "tc05",
        "backslashes in path",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>\\<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema))'
            ],
            linkedTemplates: [
                {

                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
                    expected: [
                        "Error: Undefined parameter reference: 'p3string-whoops' (arm-template (expressions)) [26,38]"
                    ]
                }
            ]
        }
    );*/

    createLinkedTemplateTest(
        "tc06",
        "Parameter type mismatch error",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [17,17]',

                "Error: Template validation failed: Template parameter JToken type is not valid. Expected 'Integer'. Actual 'String'. Please see https://aka.ms/arm-deploy/#parameter-file for usage details. (arm-template (validation)) [26,21] [The error occurred in a nested template near here] [26,21]"
            ],
            linkedTemplates: [
                {

                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
                    expected: [
                        "Warning: The parameter 'intParam' is never used. (arm-template (expressions)) [12,9-12,19]",
                        "Warning: The parameter 'stringParam' is never used. (arm-template (expressions)) [5,9-5,22]",
                    ]
                }
            ]
        }
    );

    //asdf
    // createLinkedTemplateTest(
    //     "tc07",
    //     "asdf",
    //     {
    //         mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
    //         mainParametersFile: "<TC>.parameters.json",
    //         mainTemplateExpected: [
    //             // tslint:disable-next-line: no-suspicious-comment
    //             // TODO: need schema update to fix this
    //             'Warning: Missing required property "uri" (arm-template (schema)) [17,17]',

    //             "Error: Template validation failed: Error converting value 123 to type 'Microsoft.WindowsAzure.ResourceStack.Frontdoor.Data.Definitions.DeploymentParameterDefinition'. Path 'parameters.stringParam', line 7, position 22. (arm-template (validation)) [The error occurred in a nested template near here] [1,2]"
    //         ],
    //         linkedTemplates: [
    //             {

    //                 linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
    //                 expected: [
    //                 ]
    //             }
    //         ]
    //     }
    // );
});
