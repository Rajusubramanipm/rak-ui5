sap.ui.define([], function () {
    "use strict";

    var _drafts = {};

    return {
        saveDraft: function (oPermitData) {
            return new Promise(function (resolve) {
                var sKey = oPermitData.projectId || ("draft-" + Date.now());
                _drafts[sKey] = Object.assign({}, oPermitData, { savedAt: new Date().toISOString() });
                resolve({ success: true, draftKey: sKey });
            });
        },
        getDraft: function (sProjectId) {
            return Promise.resolve(_drafts[sProjectId] || null);
        }
    };
});
