sap.ui.define(["rak/services/service/zp02/adapter/MockEngineerAdapter"], function (Adapter) {
    "use strict";
    return {
        getAll: function () {
            return Adapter.getAll();
        },
        getBySpeciality: function (sSpecialityKey) {
            return Adapter.getBySpeciality(sSpecialityKey);
        },
        // Returns engineers available for a given speciality excluding the supplied IDs.
        // Filtering logic lives here; controller consumes the result array only.
        getAvailable: function (sSpecialityKey, aExcludedIds) {
            return Adapter.getAvailable(sSpecialityKey, aExcludedIds || []);
        },
        isAlreadyAssigned: function (sEngineerId, aCurrentRows) {
            if (!sEngineerId) { return false; }
            return (aCurrentRows || []).some(function (row) {
                return row.engineerId === sEngineerId;
            });
        }
    };
});
