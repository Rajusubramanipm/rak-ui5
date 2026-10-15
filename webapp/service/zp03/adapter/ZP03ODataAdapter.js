sap.ui.define([], function () {
    "use strict";

    /**
     * ZP03 OData adapter shell — endpoints intentionally not hardcoded yet.
     */
    function notImplemented(sMethod) {
        return Promise.reject(new Error("ZP03ODataAdapter." + sMethod + " not implemented"));
    }

    return {
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
            return notImplemented("getEligibleNocs");
        },

        validateModifyEligibility: function () {
            return notImplemented("validateModifyEligibility");
        },

        getModifyDetails: function () {
            return notImplemented("getModifyDetails");
        },

        saveModifyDraft: function () {
            return notImplemented("saveModifyDraft");
        },


        getModifyDraft: function () {
            return notImplemented("getModifyDraft");
        },

        getAttachmentRequirements: function () {
            return notImplemented("getAttachmentRequirements");
        },

        getPaymentFees: function () {
            return notImplemented("getPaymentFees");
        },

        getReferenceData: function () {
            return notImplemented("getReferenceData");
        },

        getRequestStatus: function () {
            return notImplemented("getRequestStatus");
        }
    };
});
