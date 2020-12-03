// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import * as assert from "assert";
import { Uri } from "vscode";
import { parseError } from "vscode-azureextensionui";
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
                    const childPath = resolveInTestFolder(tcString(linkedTemplate.linkedTemplateFile, testCase));
                    const childUri = Uri.file(childPath);
                    try {
                        await testDiagnosticsFromUri(
                            childUri,
                            {
                            },
                            tcDiagnostics(linkedTemplate.expected, testCase)
                        );
                    } catch (err) {
                        throw new Error(`Diagnostics failed for linked template ${childPath}: ${parseError(err).message}`);
                    }
                }
            });
    }

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

                `Error: Template validation failed: Could not find linked template file `
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
    /* TODO: slow because showing two diagnostics groups
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

    // tslint:disable-next-line: no-suspicious-comment
    // TODO: Hangs sometimes
    createLinkedTemplateTest(
        "tc06",
        "Parameter type mismatch error",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            // waitForDiagnosticSubstring is needed because the error is given during a re-validation, not immediately, so hard to know how long
            //   to wait
            waitForDiagnosticSubstring: "Template parameter JToken type is not valid",
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

    createLinkedTemplateTest(
        "tc07",
        "2 levels deep, error in parameters to 2nd level, only top level has a parameter file - we only traverse to child1, not child2",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [17,17]',
            ],
            linkedTemplates: [
                {
                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child1.json",
                    expected: [
                        // tslint:disable-next-line: no-suspicious-comment
                        // TODO: need schema update to fix this
                        'Warning: Missing required property "uri" (arm-template (schema)) [16,17]',

                        "Warning: The variable 'unusedVar' is never used. (arm-template (expressions)) [5,9]",
                    ]
                }
            ]
        }
    );

    createLinkedTemplateTest(
        "tc08",
        "2 levels deep, error in parameters to 2nd level, child1.json also has a parameter file - child2 gets traversed via the opened child1 (since it has a param file)",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [17,17]',
            ],
            linkedTemplates: [
                {
                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child1.json",
                    expected: [
                        // tslint:disable-next-line: no-suspicious-comment
                        // TODO: need schema update to fix this
                        'Warning: Missing required property "uri" (arm-template (schema)) [16,17]',

                        "Warning: The variable 'unusedVar' is never used. (arm-template (expressions)) [5,9]",
                        "Error: Template validation failed: Template parameter JToken type is not valid. Expected 'Integer'. Actual 'String'. Please see https://aka.ms/arm-deploy/#parameter-file for usage details. (arm-template (validation)) [25,21] [The error occurred in a nested template near here] [25,21]",
                    ]
                },
                {
                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child2.json",
                    expected: [
                        "Warning: The parameter 'intParam' is never used. (arm-template (expressions)) [12,9-12,19]",
                        "Warning: The parameter 'stringParam' is never used. (arm-template (expressions)) [5,9-5,22]",
                    ]
                }
            ]
        }
    );

    createLinkedTemplateTest(
        "tc09",
        "two calls to same linked template, second call has an error",
        {
            mainTemplateFile: "templates/linkedTemplates/<TC>/<TC>.json",
            mainParametersFile: "<TC>.parameters.json",
            mainTemplateExpected: [
                // tslint:disable-next-line: no-suspicious-comment
                // TODO: need schema update to fix this
                'Warning: Missing required property "uri" (arm-template (schema)) [17,17]',
                'Warning: Missing required property "uri" (arm-template (schema)) [33,17]',

                "Error: Template validation failed: Template parameter JToken type is not valid. Expected 'Integer'. Actual 'String'. Please see https://aka.ms/arm-deploy/#parameter-file for usage details. (arm-template (validation)) [35,21] [The error occurred in a nested template near here] [35,21]",
            ],
            linkedTemplates: [
                {
                    linkedTemplateFile: "templates/linkedTemplates/<TC>/subfolder/child.json",
                    expected: [
                        'Warning: Missing required property "uri" (arm-template (schema)) [16,17-16,31]',
                        "Warning: The parameter 'intParam' is never used. (arm-template (expressions)) [5,9-5,19]",
                    ]
                }
            ]
        }
    );
});
