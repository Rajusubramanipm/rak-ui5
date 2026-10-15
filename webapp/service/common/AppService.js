sap.ui.define([], function () {
    "use strict";

    /**
     * Shared application-level helpers (not ZP02/ZP03 business rules).
     */
    return {
        getActiveService: function (oAppStateModel) {
            return oAppStateModel ? oAppStateModel.getProperty("/activeService") : null;
        },

        setActiveService: function (oAppStateModel, sService) {
            if (oAppStateModel) {
                oAppStateModel.setProperty("/activeService", sService);
            }
        }
    };
});
