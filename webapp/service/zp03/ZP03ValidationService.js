sap.ui.define([], function () {
    "use strict";

    /**
     * ZP03 validation rules (BRD-driven).
     * Modify Infrastructure NOC is allowed only for active, eligible NOCs.
     */
    function normalizeStatus(oNoc) {
        return String((oNoc && (oNoc.status || oNoc.Status)) || "").toUpperCase();
    }

    function normalizeEligibility(oNoc) {
        return String((oNoc && (oNoc.eligibilityStatus || oNoc.EligibilityStatus)) || "").toUpperCase();
    }

    return {
        isNocEligibleForModify: function (oNoc) {
            if (!oNoc) {
                return {
                    valid: false,
                    reason: "NOC_REQUIRED",
                    message: "Please select an Infrastructure NOC to continue."
                };
            }

            var sStatus = normalizeStatus(oNoc);
            var sEligibility = normalizeEligibility(oNoc);
            var sCustomReason = oNoc.eligibilityReason || null;

            if (sStatus === "EXPIRED") {
                return {
                    valid: false,
                    reason: "NOC_EXPIRED",
                    message: sCustomReason || "This Infrastructure NOC is expired and cannot be modified. Only active NOCs are eligible for Modify."
                };
            }

            if (sStatus === "CANCELLED") {
                return {
                    valid: false,
                    reason: "NOC_CANCELLED",
                    message: sCustomReason || "This Infrastructure NOC was cancelled and cannot be modified."
                };
            }

            if (sStatus !== "ACTIVE") {
                return {
                    valid: false,
                    reason: "NOC_NOT_ACTIVE",
                    message: sCustomReason || "Only active Infrastructure NOCs can be modified."
                };
            }

            if (sEligibility === "NOT_ELIGIBLE") {
                return {
                    valid: false,
                    reason: "NOC_NOT_ELIGIBLE",
                    message: sCustomReason || "This NOC is not eligible for modification."
                };
            }

            return {
                valid: true,
                reason: null,
                message: null
            };
        },

        /**
         * Validates the currently selected NOC for Continue navigation.
         * @param {object} oSelectedNoc
         * @returns {{valid:boolean, reason:string|null, message:string|null}}
         */
        validateNocSelection: function (oSelectedNoc) {
            return this.isNocEligibleForModify(oSelectedNoc);
        },

        /**
         * Alias kept for earlier foundation callers.
         */
        validateSelectNoc: function (oSelectedNoc) {
            return this.validateNocSelection(oSelectedNoc);
        }
    };
});
