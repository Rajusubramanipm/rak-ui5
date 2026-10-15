sap.ui.define([
    "rak/services/service/zp02/adapter/MockAdapter"
], function (MockAdapter) {
    "use strict";

    /**
     * AppService
     *
     * Domain service for application-level data.
     * Controllers call service methods — never adapters directly.
     */
    var AppService = {

        _adapter: MockAdapter,

        /**
         * Fetch application configuration.
         * @returns {Promise<Object>}
         */
        getAppConfig: function () {
            return this._adapter.getAppConfig();
        }

    };

    return AppService;
});
