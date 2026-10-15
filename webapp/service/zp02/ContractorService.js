sap.ui.define(["rak/services/service/zp02/adapter/MockContractorAdapter"], function (Adapter) {
    "use strict";
    return {
        findByTradeLicence: function (sLicenceNo) {
            return Adapter.findByTradeLicence(sLicenceNo);
        },
        findByName: function (sName) {
            return Adapter.findByName(sName);
        }
    };
});
