sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
    "use strict";

    var _cache = null;

    function _load() {
        if (_cache) {
            return _cache;
        }
        _cache = new Promise(function (resolve, reject) {
            var oModel = new JSONModel();
            // Append timestamp to bypass HTTP cache during development
            var sUrl = sap.ui.require.toUrl("rak/services/model/mock/zp02/projects.json") + "?v=" + Date.now();
            oModel.loadData(sUrl, null, false);
            var oData = oModel.getData();
            if (oData && oData.projects) {
                resolve(oData);
            } else {
                _cache = null;
                reject(new Error("MockProjectAdapter: failed to load projects.json"));
            }
        });
        return _cache;
    }

    return {
        getProjects: function () {
            return _load().then(function (d) { return d.projects; });
        },
        getStatusOptions: function () {
            return _load().then(function (d) { return d.statusOptions; });
        },
        getRoleOptions: function () {
            return _load().then(function (d) { return d.roleOptions; });
        },
        getProjectMetadata: function () {
            return _load().then(function (d) {
                return {
                    totalCount: d.totalCount || 153,
                    resultCount: d.resultCount || 32,
                    pageSize: d.pageSize || 8
                };
            });
        }
    };
});
