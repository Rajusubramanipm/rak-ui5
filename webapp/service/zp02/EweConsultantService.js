sap.ui.define(["rak/services/service/zp02/adapter/MockEweConsultantAdapter"], function (Adapter) {
    "use strict";
    return {
        search: function (sQuery) {
            return Adapter.search(sQuery);
        },
        getApplicantAsConsultant: function () {
            return Adapter.getApplicantAsConsultant();
        }
    };
});
