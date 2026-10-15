sap.ui.define([], function () {
    "use strict";

    var _cache = null;

    function _load() {
        if (_cache) { return Promise.resolve(_cache); }
        return new Promise(function (resolve, reject) {
            var sUrl = sap.ui.require.toUrl("rak/services/model/mock/zp02/referenceData.json");
            jQuery.ajax({
                url:      sUrl,
                dataType: "json",
                success:  function (data) { _cache = data; resolve(data); },
                error:    function (xhr, s, e) { reject(new Error(e || s)); }
            });
        });
    }

    return {
        getCivilDefenceAreas: function () {
            return _load().then(function (d) { return d.civilDefenceAreas || []; });
        },
        getGrantTypes: function () {
            return _load().then(function (d) { return d.grantTypes || []; });
        },
        getBuildingTypes: function () {
            return _load().then(function (d) { return d.buildingTypes || []; });
        },
        getUsageTypes: function (sBuildingTypeCode) {
            return _load().then(function (d) {
                var oMap = d.usageTypesMap || {};
                return oMap[sBuildingTypeCode] || [];
            });
        },
        getBuildingShapes: function () {
            return _load().then(function (d) { return d.buildingShapes || []; });
        },
        getFoundationTypes: function () {
            return _load().then(function (d) { return d.foundationTypes || []; });
        },
        getSlabSystems: function () {
            return _load().then(function (d) { return d.slabSystems || []; });
        },
        getFenceTypes: function () {
            return _load().then(function (d) { return d.fenceTypes || []; });
        },
        getSpecialities: function () {
            return _load().then(function (d) { return d.specialities || []; });
        },
        getContractorIdentificationTypes: function () {
            return _load().then(function (d) { return d.contractorIdentificationTypes || []; });
        }
    };
});
