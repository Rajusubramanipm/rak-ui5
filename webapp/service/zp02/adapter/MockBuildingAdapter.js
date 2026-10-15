sap.ui.define([], function () {
    "use strict";

    return {
        saveBuildings: function (aBuildings) {
            return Promise.resolve(aBuildings);
        },
        getBuildings: function () {
            return Promise.resolve([]);
        }
    };
});
