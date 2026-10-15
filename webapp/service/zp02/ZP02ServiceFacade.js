sap.ui.define([
    "rak/services/service/zp02/adapter/ZP02MockAdapter",
    "rak/services/service/zp02/adapter/ZP02ODataAdapter"
], function (MockAdapter, ODataAdapter) {
    "use strict";

    /**
     * ZP02 facade entry point.
     * Existing step services (ProjectService, PermitService, …) remain the active
     * implementation during OData rollout. New code should prefer this facade.
     *
     * Adapter selection is configuration-driven; default = mock.
     */
    var USE_ODATA = false;

    function adapter() {
        return USE_ODATA ? ODataAdapter : MockAdapter;
    }

    return {
        getMode: function () {
            return USE_ODATA ? "odata" : "mock";
        },

        getAppConfig: function () {
            return adapter().getAppConfig();
        },

        getProjects: function () {
            return adapter().getProjects();
        }
    };
});
