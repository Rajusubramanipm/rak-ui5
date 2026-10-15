sap.ui.define(["rak/services/service/zp02/adapter/MockFenceAdapter"], function (Adapter) {
    "use strict";
    return {
        saveFences: function (aFences) { return Adapter.saveFences(aFences); },
        getFences:  function ()        { return Adapter.getFences();          }
    };
});
