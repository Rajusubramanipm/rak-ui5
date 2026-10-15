sap.ui.define([], function () {
    "use strict";

    var CONSTRUCTION_TYPE_DISPLAY = "Building";

    /* Reuse the same abbreviation map as FencesBuildings.controller.js.
       Both must produce identical floor-summary strings for the same building. */
    var FLOOR_ABBR = [
        { key: "basement",    abbr: "B"    },
        { key: "lowerGround", abbr: "LG"   },
        { key: "groundUpper", abbr: "G"    },
        { key: "mezzanine",   abbr: "M"    },
        { key: "typical",     abbr: "F"    },
        { key: "unique",      abbr: "U"    },
        { key: "roof",        abbr: "R"    },
        { key: "podium",      abbr: "P"    },
        { key: "penthouse",   abbr: "Pent" },
        { key: "helipads",    abbr: "H"    },
        { key: "service",     abbr: "S"    }
    ];

    function _buildFloorSummary(oFloors) {
        if (!oFloors) { return "-"; }
        var aParts = [];
        FLOOR_ABBR.forEach(function (oMap) {
            var nVal = oFloors[oMap.key] || 0;
            if (nVal > 0) {
                aParts.push(nVal > 1 ? (nVal + oMap.abbr) : oMap.abbr);
            }
        });
        return aParts.length > 0 ? aParts.join("+") : "-";
    }

    function _buildAttachmentRows(oStep5) {
        var aRows = [];
        if (!oStep5) { return aRows; }

        var aDocItems = oStep5.docItems || [];
        aDocItems.forEach(function (oItem) {
            if (oItem.type !== "DOC") { return; }

            var bSystem = (oItem.mechanism === "SYSTEM" && oItem.mock === true);
            var sFilename = null;

            if (!bSystem && oItem.uploadState === "UPLOADED" && oItem.fileMeta) {
                sFilename = oItem.fileMeta.fileName;
            }

            var bMissing = !bSystem && !sFilename;
            var sDisplay = bSystem ? "Retrieved automatically" : (sFilename || "—");
            var sCls     = bSystem ? "rakSummarySystemDoc" : (bMissing ? "rakSummaryMissingDoc" : "");

            aRows.push({
                docLabel:       oItem.label || oItem.ref || "",
                displayFilename: sDisplay,
                displayClass:    sCls,
                isSystem:        bSystem,
                isMissing:       bMissing
            });
        });

        var aAdditional = oStep5.additionalDocuments || [];
        aAdditional.forEach(function (oDoc) {
            if (oDoc.uploadState === "UPLOADED" && oDoc.fileMeta) {
                aRows.push({
                    docLabel:        oDoc.description || "Supporting Document",
                    displayFilename: oDoc.fileMeta.fileName,
                    displayClass:    "",
                    isSystem:        false,
                    isMissing:       false
                });
            }
        });

        var oLoadCard = oStep5.loadCard;
        if (oLoadCard && oLoadCard.uploadState === "UPLOADED" && oLoadCard.fileMeta) {
            aRows.push({
                docLabel:        "Load Cards",
                displayFilename: oLoadCard.fileMeta.fileName,
                displayClass:    "",
                isSystem:        false,
                isMissing:       false
            });
        }

        return aRows;
    }

    return {

        // Submit confirmation dialog key: MSG-C02

        aggregateFromAppState: function (oAppState) {
            var oProject   = oAppState.getProperty("/selectedProject") || {};
            var oStep2     = oAppState.getProperty("/step2")           || {};
            var oStep3     = oAppState.getProperty("/step3")           || {};
            var oStep4     = oAppState.getProperty("/step4")           || {};
            var oStep5     = oAppState.getProperty("/step5");
            var oApplicant = oAppState.getProperty("/applicant")       || {};

            var oContext = {
                ownerName:     oProject.ownerName     || "",
                projectNumber: oProject.projectNumber || "",
                address:       oProject.address       || ""
            };

            var oPermit = {
                etisalatNocNo:        oStep2.etisalatNocNo         || "",
                eweNocNo:             oStep2.eweNocNo               || "",
                civilDefenceAreaText: oStep2.civilDefenceAreaText   || oStep2.civilDefenceArea || "",
                showEtisalatNoc:      oStep2.showEtisalatNoc !== false,
                showGrantFields:      !!oStep2.showGrantFields,
                grantTypeText:        oStep2.grantTypeText          || oStep2.grantType || "",
                grantExpiryDate:      oStep2.grantExpiryDate        || ""
            };

            var aEngineers = (oStep4.engineers || []).filter(function (e) {
                return e.engineerName && e.engineerName.trim();
            });

            var oRawContractor = oStep4.contractor || null;
            var oContractor = oRawContractor ? {
                contractorNo:        oRawContractor.contractorNo        || "",
                name:                oRawContractor.contractorName       || oRawContractor.name || "",
                tradeLicenceNo:      oRawContractor.tradeLicenceNo       || "",
                tradeLicenceExpiry:  oRawContractor.tradeLicenceExpiry   || "",
                registrationExpiry:  oRawContractor.registrationExpiry   || ""
            } : null;

            var oEwe = oStep4.eweConsultant || null;
            var bEweSameAsApplicant = !!oStep4.eweSameAsApplicant;

            var aBuildings = (oStep3.buildings || []).map(function (oB) {
                return {
                    displayName:      oB.displayName || oB.buildingName || "",
                    constructionType: CONSTRUCTION_TYPE_DISPLAY,
                    buildingTypeText: oB.buildingTypeText || oB.buildingTypeCode || "",
                    buildingHeight:   oB.structural ? (oB.structural.buildingHeight || "") : "",
                    floorSummary:     oB.floorSummary || _buildFloorSummary(oB.floors)
                };
            });

            var aFences = (oStep3.fences || []).map(function (oF) {
                return {
                    fenceTypeText: oF.fenceTypeText || oF.fenceTypeCode || "",
                    length:        oF.length        || "",
                    height:        oF.height        || "",
                    numberOfGates: oF.numberOfGates || ""
                };
            });

            var aAttachments = _buildAttachmentRows(oStep5);

            return {
                context:            oContext,
                permit:             oPermit,
                engineers:          aEngineers,
                contractor:         oContractor,
                contractorVisible:  oContractor !== null,
                ewe:                oEwe,
                eweVisible:         !bEweSameAsApplicant,
                buildings:          aBuildings,
                fences:             aFences,
                attachments:        aAttachments,
                applicantName:      oApplicant.name || ""
            };
        }

    };
});
