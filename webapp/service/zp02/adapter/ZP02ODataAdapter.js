sap.ui.define([], function () {
    "use strict";

    /**
     * ZP02 OData adapter shell.
     * Existing OData reads currently live in controllers/Component during migration.
     * Do not hardcode final endpoints here beyond manifest dataSources.
     */
    return {
        getAppConfig: function () {
            return Promise.reject(new Error("ZP02ODataAdapter.getAppConfig not implemented"));
        },

        getProjects: function () {
            return Promise.reject(new Error("ZP02ODataAdapter.getProjects not implemented — use existing ProjectService / OData models"));
        }
    };
});
