sap.ui.define([
    "rak/services/service/zp03/ZP03ValidationService"
], function (ZP03ValidationService) {
    "use strict";

    var EMPTY_FLAG = "rak.services.zp03.mod01.forceEmptyList";
    var DRAFT_KEY = "rak.services.zp03.modify.draft";

    function loadJson(sRelativePath) {
        var sUrl = sap.ui.require.toUrl("rak/services/" + sRelativePath);
        return new Promise(function (resolve, reject) {
            jQuery.ajax({
                url: sUrl,
                method: "GET",
                dataType: "json",
                success: resolve,
                error: function (xhr, status, err) {
                    reject(err || status || "Failed to load " + sRelativePath);
                }
            });
        });
    }

    function findNocById(oPayload, sNocId) {
        var aItems = (oPayload && oPayload.items) || [];
        return aItems.filter(function (oItem) {
            return oItem.nocId === sNocId;
        })[0] || null;
    }

    function isEmptyListForced() {
        try {
            return window.sessionStorage.getItem(EMPTY_FLAG) === "1";
        } catch (e) {
            return false;
        }
    }

    function nextCaseNumber() {
        return "CASE-" + Date.now().toString().slice(-8);
    }

    return {
        /** Figma MOD-01 / approved wizard — Confirmation outside stepper. */
        getModifyStepperLabels: function () {
            return Promise.resolve([
                "Select NOC",
                "Modification Details",
                "Work Location",
                "Attachments",
                "Review"
            ]);
        },

        getEligibleNocs: function () {
            var sPath = isEmptyListForced()
                ? "model/mock/zp03/eligibleNocs.empty.json"
                : "model/mock/zp03/eligibleNocs.json";

            return loadJson(sPath).then(function (oPayload) {
                var aItems = (oPayload.items || []).map(function (oItem) {
                    return ZP03ValidationService.enrichNoc(oItem);
                });
                return {
                    items: aItems,
                    meta: oPayload.meta || {}
                };
            });
        },

        validateModifyEligibility: function (sNocId) {
            if (!sNocId) {
                return Promise.resolve(ZP03ValidationService.validateNocSelection(null));
            }
            // Always validate against full catalogue (not empty scenario file)
            return loadJson("model/mock/zp03/eligibleNocs.json").then(function (oPayload) {
                var oRaw = findNocById(oPayload, sNocId);
                var oNoc = ZP03ValidationService.enrichNoc(oRaw);
                if (!oNoc) {
                    return {
                        valid: false,
                        reason: "NOC_NOT_FOUND",
                        message: "The selected NOC could not be found.",
                        noc: null
                    };
                }
                var oResult = ZP03ValidationService.validateNocSelection(oNoc);
                oResult.noc = oNoc;
                return oResult;
            });
        },

        /**
         * MOD-02 — merge selected NOC with mock applicant/project/PM seed data.
         * @param {object} oSelectedNoc
         * @returns {Promise<object>}
         */
        getModifyDetails: function (oSelectedNoc) {
            return loadJson("model/mock/zp03/modifyDetails.json").then(function (oPayload) {
                var sNocId = oSelectedNoc && oSelectedNoc.nocId;
                var oSeed = (oPayload.byNocId && oPayload.byNocId[sNocId]) || oPayload.defaultProject || {};
                var oApplicant = oPayload.applicant || {};
                var oPm = oSeed.projectManager || { name: "", email: "", mobile: "" };

                return {
                    existingNoc: {
                        nocNumber: oSelectedNoc.nocNumber || "",
                        status: oSelectedNoc.status || "",
                        projectReference: oSelectedNoc.projectReference || "",
                        serviceGroup: oSelectedNoc.serviceGroup || "",
                        projectType: oSelectedNoc.projectType || "",
                        projectStage: oSelectedNoc.projectStage || ""
                    },
                    applicant: {
                        businessPartner: oApplicant.businessPartnerNumber || "",
                        applicantName: oApplicant.applicantName || oApplicant.businessPartnerName || "",
                        mobile: oApplicant.mobile || "",
                        email: oApplicant.email || ""
                    },
                    project: {
                        description: oSeed.projectDescription || "",
                        owner: oSeed.projectOwner || oSelectedNoc.ownerName || "",
                        startDate: oSeed.projectStartDate || "",
                        completionDate: oSeed.projectCompletionDate || ""
                    },
                    projectManager: {
                        name: oPm.name || "",
                        email: oPm.email || "",
                        mobile: oPm.mobile || ""
                    },
                    comments: oSeed.comments || ""
                };
            });
        },

        /**
         * FR017 / §4.4.2.3.3 — mock draft persistence until OData exists.
         */
        saveModifyDraft: function (oDraftPayload) {
            var oExisting = null;
            try {
                var s = window.sessionStorage.getItem(DRAFT_KEY);
                oExisting = s ? JSON.parse(s) : null;
            } catch (e) {
                oExisting = null;
            }

            var oDraft = {
                caseNumber: (oExisting && oExisting.caseNumber) || nextCaseNumber(),
                status: "Saved as Draft",
                selectedNoc: oDraftPayload && oDraftPayload.selectedNoc ? oDraftPayload.selectedNoc : null,
                details: (oDraftPayload && oDraftPayload.details) || null,
                savedAt: new Date().toISOString(),
                meta: {
                    brd: "FR017 / 4.4.2.3.3",
                    mode: "mock"
                }
            };

            try {
                window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(oDraft));
            } catch (e) {
                /* ignore */
            }

            return Promise.resolve(oDraft);
        },

        getModifyDraft: function () {
            try {
                var s = window.sessionStorage.getItem(DRAFT_KEY);
                if (s) {
                    return Promise.resolve(JSON.parse(s));
                }
            } catch (e) {
                /* fall through */
            }
            return loadJson("model/mock/zp03/modifyDraft.json");
        },

        getAttachmentRequirements: function () {
            return loadJson("model/mock/zp03/attachmentRequirements.json");
        },

        getPaymentFees: function () {
            return loadJson("model/mock/zp03/paymentFees.json");
        },

        getReferenceData: function () {
            return loadJson("model/mock/zp03/referenceData.json");
        },

        getRequestStatus: function (sRequestId) {
            return loadJson("model/mock/zp03/requestStatus.json").then(function (oData) {
                if (!sRequestId) {
                    return oData;
                }
                var aItems = oData.items || [];
                return aItems.filter(function (oItem) {
                    return oItem.requestId === sRequestId;
                })[0] || null;
            });
        }
    };
});
