sap.ui.define([], function () {
    "use strict";

    return {
        saveFences: function (aFences) {
            return Promise.resolve(aFences);
        },
        getFences: function () {
            return Promise.resolve([]);
        }
    };
});
