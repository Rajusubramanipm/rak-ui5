sap.ui.define([], function () {
    "use strict";

    // Appendix 5.6 Table 2 — column order
    var _TYPES = [
        "FENCE",
        "PRIVATE_VILLA",
        "SERVICE_BLOCK",
        "RES_INV_VILLA",
        "STOREY_MULTI_STOREY",
        "DEVELOPMENT_PROJECT",
        "INDUSTRIAL_BUILDING",
        "PUBLIC_BUILDING"
    ];

    // Appendix 5.6 Table 2 — applicability matrix
    // Values: "M" = Mandatory, "O" = Optional, "—" = Not shown
    var _TABLE2 = {
        "DOC-01":   ["M","M","M","M","M","M","M","M"],
        "DOC-02":   ["O","O","O","O","O","O","O","O"],
        "DOC-03":   ["M","M","M","M","M","M","M","M"],
        "DOC-04":   ["M","M","M","M","M","M","M","M"],
        "DOC-04.1": ["M","M","M","M","M","M","M","M"],
        "DOC-05":   ["—","—","—","M","M","M","M","O"],
        "DOC-06":   ["O","O","O","O","O","O","O","O"],
        "DOC-07":   ["M","M","M","M","M","M","M","M"],
        "DOC-08":   ["—","—","—","M","M","M","M","M"],
        "DOC-09":   ["M","M","M","M","M","M","M","M"],
        "DOC-10":   ["—","—","—","M","M","M","M","M"],
        "DOC-11":   ["—","M","M","—","—","—","—","—"],
        "DOC-12":   ["—","—","—","—","O","O","O","O"],
        "DOC-13":   ["—","—","—","—","O","O","—","O"],
        "DOC-14":   ["—","—","—","—","O","M","—","O"],
        "DOC-15":   ["—","—","—","O","O","O","O","O"],
        "DOC-16":   ["O","O","O","O","O","M","O","O"],
        "DOC-17":   ["M","M","M","M","M","M","M","M"],
        "DOC-18":   ["M","M","M","M","M","M","M","M"],
        "DOC-19":   ["M","M","M","M","M","M","M","M"],
        "DOC-20":   ["M","M","M","M","M","M","M","M"],
        "DOC-21":   ["M","M","M","M","M","M","M","M"],
        "DOC-22":   ["—","M","M","M","M","M","M","M"],
        "DOC-23":   ["—","—","—","—","—","M","—","—"],
        "DOC-24":   ["—","—","—","—","—","O","—","—"]
    };

    // Full document register — 25 entries (DOC-01 to DOC-24 + DOC-04.1)
    var _REGISTER = [
        {
            ref: "DOC-01", category: "Site Documentation",
            name: "Affection Plan (Site Plan)",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-02", category: "Site Documentation",
            name: "Title Deed",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-03", category: "Site Documentation",
            name: "Owner ID",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-04", category: "NOC & Clearance",
            name: "NOC for Land Clearance from EWE",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                linkedToStep2: "eweNoc",
                note: "Linked to EWE NOC captured in Step 2."
            }
        },
        {
            ref: "DOC-04.1", category: "NOC & Clearance",
            name: "NOC for Land Clearance from Etisalat-Du",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                linkedToStep2: "etisalatNoc",
                note: "Linked to Etisalat/Du NOC captured in Step 2."
            }
        },
        {
            ref: "DOC-05", category: "NOC & Clearance",
            name: "DCR (Building Regulations)",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-06", category: "Site Documentation",
            name: "Demarcation Certificate",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-07", category: "Site Documentation",
            name: "Level Certificate",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-08", category: "Architectural Drawings",
            name: "Coloured Façades",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-09", category: "Site Documentation",
            name: "Consultant Assignment Letter",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-10", category: "Smart Building",
            name: "Smart Building Index",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                note: "Mandatory when building area exceeds 1,000 m². Building area not captured in current Step 3. FRONTEND_DATA_LIMITATION: condition represented in metadata only."
            }
        },
        {
            ref: "DOC-11", category: "Programme & Grant",
            name: "Sheikh Zayed Housing Programme Letter",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                linkedToStep2: "grantType",
                grantTypeKey: "GT-01",
                note: "Applicable when project is under Sheikh Zayed Housing Programme grant."
            }
        },
        {
            ref: "DOC-12", category: "External Approvals",
            name: "External Approvals",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                tooltip: "External authority approvals required for the project."
            }
        },
        {
            ref: "DOC-13", category: "External Approvals",
            name: "Developer Approvals",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-14", category: "External Approvals",
            name: "Masterplan Approvals",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-15", category: "NOC & Clearance",
            name: "Traffic NOC",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-16", category: "NOC & Clearance",
            name: "Roads NOC",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-17", category: "Engineering Documents",
            name: "Soil Investigation Report",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-18", category: "Engineering Documents",
            name: "Structural Calculation / Report",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-19", category: "Engineering Documents",
            name: "Structural Models (ETABS / SAFE / PROKON, etc.)",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-20", category: "Engineering Documents",
            name: "Letter of Undertaking for Specialised Works",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        // DOC-21 is always mandatory — handled in dedicated Load Cards section
        {
            ref: "DOC-21", category: "Load Cards",
            name: "EWE Load Cards",
            providingMechanism: "UPLOAD",
            conditionMetadata: {
                alwaysMandatory: true,
                // LOAD_CARD_EXTENSION_FILTER = FRONTEND_IMPLEMENTATION_ASSUMPTION
                // BRD says Excel template format; xls/xlsx used as implementation representation
                fileType: ["xls", "xlsx"],
                templateDownload: true,
                note: "DOC-21: Mandatory all projects. Download Excel template, complete, upload. LOAD_CARD_EXTENSION_FILTER = FRONTEND_IMPLEMENTATION_ASSUMPTION."
            }
        },
        {
            ref: "DOC-22", category: "Smart Building",
            name: "Barjeel Documents",
            providingMechanism: "UPLOAD",
            conditionMetadata: null
        },
        {
            ref: "DOC-23", category: "Preliminary Approvals",
            name: "Preliminary Approval (Architecture)",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        },
        {
            ref: "DOC-24", category: "Preliminary Approvals",
            name: "Preliminary Approval (Structure)",
            providingMechanism: "SYSTEM",
            conditionMetadata: null
        }
    ];

    // Mock system prerequisite availability map
    // true  = document is available → show as retrieved (read-only)
    // false = document unavailable → show upload fallback
    var _MOCK_PREREQ = {
        "DOC-01": true,
        "DOC-02": true,
        "DOC-05": true,
        "DOC-06": false,
        "DOC-07": true,
        "DOC-09": true,
        "DOC-15": true,
        "DOC-16": false,
        "DOC-23": false,
        "DOC-24": false
    };

    // Step 3 L06 buildingTypeCode → Appendix 5.6 matrix column key
    // DEVELOPMENT_PROJECT has no L06 mapping — reserved for future use
    var _BT_MAP = {
        "BT-01": "INDUSTRIAL_BUILDING",
        "BT-02": "RES_INV_VILLA",
        "BT-03": "STOREY_MULTI_STOREY",
        "BT-04": "PRIVATE_VILLA",
        "BT-05": "PUBLIC_BUILDING",
        "BT-06": "SERVICE_BLOCK",
        "BT-07": "STOREY_MULTI_STOREY"
    };

    return {

        getDocumentRegister: function () {
            return Promise.resolve(_REGISTER.slice());
        },

        getTable2: function () {
            return Promise.resolve({ types: _TYPES.slice(), matrix: _TABLE2 });
        },

        getPrerequisiteMap: function () {
            return Promise.resolve(_MOCK_PREREQ);
        },

        getBuildingTypeMap: function () {
            return Promise.resolve(_BT_MAP);
        },

        // Resolve applicability per doc ref for a given set of active column keys.
        // Aggregation: UNION_WITH_MANDATORY_PRIORITY
        //   M in any active type → MANDATORY
        //   O in any active type (and no M) → OPTIONAL
        //   — in all active types → hidden (not returned)
        // MULTI_BUILDING_DOCUMENT_AGGREGATION = UNION_WITH_MANDATORY_PRIORITY
        // FRONTEND_ASSUMPTION: pending business clarification.
        resolveApplicability: function (aActiveTypes) {
            return new Promise(function (resolve) {
                var aResult = [];
                Object.keys(_TABLE2).forEach(function (sRef) {
                    var aRow = _TABLE2[sRef];
                    var sBest = "—";
                    aActiveTypes.forEach(function (sType) {
                        var iCol = _TYPES.indexOf(sType);
                        if (iCol === -1) { return; }
                        var sCell = aRow[iCol];
                        if (sCell === "M") {
                            sBest = "M";
                        } else if (sCell === "O" && sBest !== "M") {
                            sBest = "O";
                        }
                    });
                    aResult.push({ ref: sRef, applicability: sBest });
                });
                resolve(aResult);
            });
        },

        simulateUpload: function (progressCb, doneCb) {
            var iProgress = 0;
            var iInterval = setInterval(function () {
                iProgress = Math.min(iProgress + 10, 100);
                progressCb(iProgress);
                if (iProgress >= 100) {
                    clearInterval(iInterval);
                    doneCb();
                }
            }, 150);
            return iInterval;
        },

        // MAX_FILE_SIZE = 10 MB
        // GENERAL_FILE_EXTENSION_RULE = NOT SPECIFIED IN BRD → no extension filter for general docs
        // DOC-21: LOAD_CARD_EXTENSION_FILTER = FRONTEND_IMPLEMENTATION_ASSUMPTION (xls/xlsx)
        validateFileMetadata: function (oFileMeta, sDocRef) {
            var MAX_BYTES = 10 * 1024 * 1024;
            if (!oFileMeta) { return { valid: false, errorCode: "V07" }; }
            if (oFileMeta.fileSize > MAX_BYTES) { return { valid: false, errorCode: "V07" }; }
            if (sDocRef === "DOC-21") {
                var sName = (oFileMeta.fileName || "").toLowerCase();
                var bExcel = sName.slice(-4) === ".xls" || sName.slice(-5) === ".xlsx";
                if (!bExcel) { return { valid: false, errorCode: "V07" }; }
            }
            return { valid: true, errorCode: null };
        }

    };
});
