sap.ui.define([
    "rak/services/service/zp03/adapter/ZP03MockAdapter",
    "rak/services/service/zp03/adapter/ZP03ODataAdapter"
], function (MockAdapter, ODataAdapter) {
    "use strict";

    /**
     * ZP03 Infrastructure NOC service facade.
     * Controllers must call this facade only — never mock JSON or adapters directly.
     */
    var USE_ODATA = false;

    function adapter() {
        return USE_ODATA ? ODataAdapter : MockAdapter;
    }

    return {
        getMode: function () {
            return USE_ODATA ? "odata" : "mock";
        },

        getModifyStepperLabels: function () {
            return adapter().getModifyStepperLabels();
        },

        getEligibleNocs: function () {
            return adapter().getEligibleNocs();
        },

        /**
         * Validates whether a NOC id is eligible for Modify.
         * @param {string} sNocId
         * @returns {Promise<{valid:boolean, reason:string|null, message:string|null, noc?:object}>}
         */
        validateModifyEligibility: function (sNocId) {
            return adapter().validateModifyEligibility(sNocId);
        },

        getModifyDetails: function (oSelectedNoc) {
            return adapter().getModifyDetails(oSelectedNoc);
        },

        /**
         * FR017 — Save Modify request as draft.
         * @param {object} oDraftPayload
         * @returns {Promise<object>} draft with caseNumber + status Saved as Draft
         */
        saveModifyDraft: function (oDraftPayload) {
            return adapter().saveModifyDraft(oDraftPayload);
        },

        getModifyDraft: function () {
            return adapter().getModifyDraft();
        },

        getAttachmentRequirements: function () {
            return adapter().getAttachmentRequirements();
        },

        getPaymentFees: function () {
            return adapter().getPaymentFees();
        },

        getReferenceData: function () {
            return adapter().getReferenceData();
        },

        getRequestStatus: function (sRequestId) {
            return adapter().getRequestStatus(sRequestId);
        }
    };
});
