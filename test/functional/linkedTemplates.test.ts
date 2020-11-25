// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import { testDiagnostics } from "../support/diagnostics";
import { testWithLanguageServer } from "../support/testWithLanguageServer";

suite("Linked templates functional tests", () => {
    testWithLanguageServer("tc1 one level, no errors, child in subfolder", async () => {
        await testDiagnostics(
            "templates/linkedTemplates/tc1-1level-noerrors/main.json",
            {},
            []
        );
    });
});
