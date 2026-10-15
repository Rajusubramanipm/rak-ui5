sap.ui.define([
    "rak/services/service/zp03/ZP03ValidationService"
], function (ZP03ValidationService) {
    "use strict";

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

    return {
        getModifyStepperLabels: function () {
            return Promise.resolve([
                "Select NOC",
                "Details",
                "Work Location",
                "Attachments",
                "Review",
                "Confirmation"
            ]);
        },

        getEligibleNocs: function () {
            return loadJson("model/mock/zp03/eligibleNocs.json");
        },

        validateModifyEligibility: function (sNocId) {
            if (!sNocId) {
                return Promise.resolve(ZP03ValidationService.validateNocSelection(null));
            }
            return this.getEligibleNocs().then(function (oPayload) {
                var oNoc = findNocById(oPayload, sNocId);
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

        getModifyDraft: function () {
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
