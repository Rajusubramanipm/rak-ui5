sap.ui.define([], function () {
    "use strict";

    var _consultants = [
        { consultantId: "EWE001", name: "RAK Municipality",         licenceNo: "CN-12345" },
        { consultantId: "EWE002", name: "RAK Water & Power",        licenceNo: "CN-67890" },
        { consultantId: "EWE003", name: "Al Etihad Engineering",    licenceNo: "CN-11223" }
    ];

    // When applicant is available in EWE, this record is used for same-as-applicant.
    var _applicantAsConsultant = {
        consultantId: "EWE-APPLICANT",
        name:         "Abdullah Al-Aziz (Applicant)",
        licenceNo:    "CN-APPL-001"
    };

    return {
        search: function (sQuery) {
            var sQ = (sQuery || "").trim().toLowerCase();
            if (!sQ) { return Promise.resolve(_consultants.slice()); }
            return Promise.resolve(_consultants.filter(function (c) {
                return c.name.toLowerCase().indexOf(sQ) !== -1 ||
                       c.licenceNo.toLowerCase().indexOf(sQ) !== -1;
            }));
        },

        getApplicantAsConsultant: function () {
            return Promise.resolve(_applicantAsConsultant);
        }
    };
});
