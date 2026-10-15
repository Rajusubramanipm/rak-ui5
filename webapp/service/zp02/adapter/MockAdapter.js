sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    /**
     * MockAdapter
     *
     * Satisfies the data-access contract using local JSON files.
     * Replace with ODataAdapter or RestAdapter when a live backend is available.
     * All methods return native Promises so callers are backend-agnostic.
     */
    var MockAdapter = {

        /**
         * Returns application-level configuration data.
         * @returns {Promise<Object>}
         */
        getAppConfig: function () {
            return new Promise(function (resolve, reject) {
                var oModel = new JSONModel();
                oModel.loadData("model/mock/zp02/app.json");
                oModel.attachRequestCompleted(function () {
                    resolve(oModel.getData());
                });
                oModel.attachRequestFailed(function (oErr) {
                    reject(oErr);
                });
            });
        }

    };

    return MockAdapter;
});
