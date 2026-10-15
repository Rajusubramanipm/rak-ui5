sap.ui.define(["rak/services/service/zp02/adapter/MockPermitAdapter"], function (Adapter) {
    "use strict";
    return {
        saveDraft: function (oPermitData) { return Adapter.saveDraft(oPermitData); },
        getDraft:  function (sProjectId)  { return Adapter.getDraft(sProjectId);  }
    };
});
