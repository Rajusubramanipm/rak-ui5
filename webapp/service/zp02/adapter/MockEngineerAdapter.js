sap.ui.define([], function () {
    "use strict";

    var _cache = null;

    function _load() {
        if (_cache) { return Promise.resolve(_cache); }
        return new Promise(function (resolve, reject) {
            var sUrl = sap.ui.require.toUrl("rak/services/model/mock/zp02/engineers.json");
            jQuery.ajax({
                url:      sUrl,
                dataType: "json",
                success:  function (data) { _cache = data; resolve(data); },
                error:    function (xhr, s, e) { reject(new Error(e || s)); }
            });
        });
    }

    return {
        getAll: function () {
            return _load();
        },

        getBySpeciality: function (sSpecialityKey) {
            return _load().then(function (aAll) {
                if (!sSpecialityKey) { return []; }
                return aAll.filter(function (e) {
                    return e.specialityKey === sSpecialityKey;
                });
            });
        },

        // Returns engineers matching speciality AND not in the excluded IDs list.
        getAvailable: function (sSpecialityKey, aExcludedIds) {
            var aExclude = aExcludedIds || [];
            return _load().then(function (aAll) {
                return aAll.filter(function (e) {
                    return e.specialityKey === sSpecialityKey &&
                           aExclude.indexOf(e.engineerId) === -1;
                });
            });
        }
    };
});
