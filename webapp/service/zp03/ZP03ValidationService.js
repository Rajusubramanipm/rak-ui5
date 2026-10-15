sap.ui.define([], function () {
    "use strict";

    /**
     * ZP03 Modify eligibility & MOD-02 field validation — BRD V1.4 §4.4.2.3.
     */
    var MSG = {
        REQUIRED: "Please select an Infrastructure NOC to continue.",
        EXPIRED: "This Infrastructure NOC is expired and cannot be modified. Only active NOCs are eligible for Modify.",
        CANCELLED: "This Infrastructure NOC was cancelled and cannot be modified.",
        NOT_ACTIVE: "Only active Infrastructure NOCs can be modified.",
        LATER_STAGE: "This NOC can't be modified because a later-stage NOC already exists for this project.",
        STAGE_NOT_ALLOWED: "Only active Design NOCs, or Design & Construction NOCs with Low complexity, can be modified."
    };

    var MSG_MANDATORY = "Mandatory information";
    var MSG_EMAIL = "Enter a valid email address.";
    var MSG_MOBILE = "Enter a valid mobile number.";

    function normalizeStatus(oNoc) {
        return String((oNoc && (oNoc.status || oNoc.Status)) || "").toUpperCase();
    }

    function normalizeStage(oNoc) {
        return String((oNoc && (oNoc.projectStage || oNoc.ProjectStage)) || "").trim();
    }

    function normalizeComplexity(oNoc) {
        return String((oNoc && (oNoc.complexity || oNoc.Complexity)) || "").trim().toLowerCase();
    }

    function hasLaterStageBlock(oNoc) {
        if (!oNoc) {
            return false;
        }
        if (oNoc.hasLaterStageNoc === true || oNoc.laterStageBlocked === true) {
            return true;
        }
        var sCode = String(oNoc.blockReasonCode || oNoc.BlockReasonCode || "").toUpperCase();
        return sCode === "LATER_STAGE" || sCode === "LATER_STAGE_NOC";
    }

    function matchesModifyStageRule(oNoc) {
        var sStage = normalizeStage(oNoc);
        if (sStage === "Design NOC") {
            return true;
        }
        if (sStage === "Design & Construction NOC" && normalizeComplexity(oNoc) === "low") {
            return true;
        }
        return false;
    }

    function evaluate(oNoc) {
        if (!oNoc) {
            return {
                valid: false,
                reason: "NOC_REQUIRED",
                message: MSG.REQUIRED,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        var sStatus = normalizeStatus(oNoc);

        if (sStatus === "EXPIRED") {
            return {
                valid: false,
                reason: "NOC_EXPIRED",
                message: MSG.EXPIRED,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        if (sStatus === "CANCELLED") {
            return {
                valid: false,
                reason: "NOC_CANCELLED",
                message: MSG.CANCELLED,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        if (sStatus !== "ACTIVE") {
            return {
                valid: false,
                reason: "NOC_NOT_ACTIVE",
                message: MSG.NOT_ACTIVE,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        if (!matchesModifyStageRule(oNoc)) {
            return {
                valid: false,
                reason: "NOC_STAGE_NOT_ALLOWED",
                message: MSG.STAGE_NOT_ALLOWED,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        if (hasLaterStageBlock(oNoc)) {
            return {
                valid: false,
                reason: "NOC_LATER_STAGE",
                message: MSG.LATER_STAGE,
                derivedEligibility: "NOT_ELIGIBLE"
            };
        }

        return {
            valid: true,
            reason: null,
            message: null,
            derivedEligibility: "ELIGIBLE"
        };
    }

    function trim(v) {
        return String(v == null ? "" : v).trim();
    }

    function isValidEmail(s) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    }

    function isValidMobile(s) {
        var digits = String(s).replace(/[\s\-()]/g, "");
        if (/^\+?9715\d{8}$/.test(digits)) {
            return true;
        }
        if (/^05\d{8}$/.test(digits)) {
            return true;
        }
        if (/^5\d{8}$/.test(digits)) {
            return true;
        }
        return false;
    }

    function validatePmFields(oDetails) {
        var oPm = (oDetails && oDetails.projectManager) || {};
        var sName = trim(oPm.name);
        var sEmail = trim(oPm.email);
        var sMobile = trim(oPm.mobile);
        var oFields = {
            name: { valueState: "None", valueStateText: "" },
            email: { valueState: "None", valueStateText: "" },
            mobile: { valueState: "None", valueStateText: "" }
        };
        var bOk = true;

        if (!sName) {
            oFields.name = { valueState: "Error", valueStateText: MSG_MANDATORY };
            bOk = false;
        }
        if (!sEmail) {
            oFields.email = { valueState: "Error", valueStateText: MSG_MANDATORY };
            bOk = false;
        } else if (!isValidEmail(sEmail)) {
            oFields.email = { valueState: "Error", valueStateText: MSG_EMAIL };
            bOk = false;
        }
        if (!sMobile) {
            oFields.mobile = { valueState: "Error", valueStateText: MSG_MANDATORY };
            bOk = false;
        } else if (!isValidMobile(sMobile)) {
            oFields.mobile = { valueState: "Error", valueStateText: MSG_MOBILE };
            bOk = false;
        }

        return {
            valid: bOk,
            fields: oFields,
            message: bOk ? null : MSG_MANDATORY
        };
    }

    return {
        MESSAGES: MSG,

        isListCandidate: function (oNoc) {
            return normalizeStatus(oNoc) === "ACTIVE" && matchesModifyStageRule(oNoc);
        },

        isNocEligibleForModify: function (oNoc) {
            return evaluate(oNoc);
        },

        validateNocSelection: function (oSelectedNoc) {
            return evaluate(oSelectedNoc);
        },

        validateSelectNoc: function (oSelectedNoc) {
            return evaluate(oSelectedNoc);
        },

        validateDraftAtSelectNoc: function (oSelectedNoc) {
            if (!oSelectedNoc) {
                return { valid: true, reason: null, message: null };
            }
            if (!this.isListCandidate(oSelectedNoc)) {
                return {
                    valid: false,
                    reason: "NOC_STAGE_NOT_ALLOWED",
                    message: MSG.STAGE_NOT_ALLOWED
                };
            }
            return { valid: true, reason: null, message: null };
        },

        enrichNoc: function (oNoc) {
            if (!oNoc) {
                return null;
            }
            var oCopy = JSON.parse(JSON.stringify(oNoc));
            var oResult = evaluate(oCopy);
            oCopy.eligibilityStatus = oResult.derivedEligibility;
            oCopy.eligibilityReason = oResult.message;
            oCopy.blockReasonCode = oResult.reason;
            return oCopy;
        },

        validateModificationDetails: function (oDetails) {
            return validatePmFields(oDetails);
        },

        validateDraftAtModificationDetails: function (oDetails) {
            var oPm = (oDetails && oDetails.projectManager) || {};
            var bAny = !!(trim(oPm.name) || trim(oPm.email) || trim(oPm.mobile));
            if (!bAny) {
                return {
                    valid: true,
                    fields: {
                        name: { valueState: "None", valueStateText: "" },
                        email: { valueState: "None", valueStateText: "" },
                        mobile: { valueState: "None", valueStateText: "" }
                    },
                    message: null
                };
            }
            return validatePmFields(oDetails);
        }
    };
});
