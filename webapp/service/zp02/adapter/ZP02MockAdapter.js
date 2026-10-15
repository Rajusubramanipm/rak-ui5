sap.ui.define([
    "rak/services/service/zp02/adapter/MockAdapter",
    "rak/services/service/zp02/adapter/MockProjectAdapter"
], function (MockAdapter, MockProjectAdapter) {
    "use strict";

    /**
     * Unified ZP02 mock adapter shell — delegates to existing mock adapters.
     */
    return {
        getAppConfig: function () {
            return MockAdapter.getAppConfig();
        },

        getProjects: function () {
            return MockProjectAdapter.getProjects();
        }
    };
});
