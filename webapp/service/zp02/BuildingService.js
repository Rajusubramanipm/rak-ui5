sap.ui.define(["rak/services/service/zp02/adapter/MockBuildingAdapter"], function (Adapter) {
    "use strict";
    return {
        saveBuildings: function (aBuildings) { return Adapter.saveBuildings(aBuildings); },
        getBuildings:  function ()           { return Adapter.getBuildings();             }
    };
});
