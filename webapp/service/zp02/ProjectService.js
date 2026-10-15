sap.ui.define(["rak/services/service/zp02/adapter/MockProjectAdapter"], function (Adapter) {
    "use strict";

    return {
        getProjects: function () {
            return Adapter.getProjects();
        },

        getFilterOptions: function () {
            return Promise.all([
                Adapter.getStatusOptions(),
                Adapter.getRoleOptions()
            ]).then(function (results) {
                return { statusOptions: results[0], roleOptions: results[1] };
            });
        },

        getProjectMetadata: function () {
            return Adapter.getProjectMetadata();
        },

        filterProjects: function (aProjects, oFilters) {
            return aProjects.filter(function (p) {
                var bRole = !oFilters.role || oFilters.role === p.roleCode;
                var bStatus = !oFilters.status || oFilters.status === p.statusCode;
                var bDate = !oFilters.date || (p.createdOn || "").startsWith(oFilters.date);
                var sSearch = (oFilters.search || "").toLowerCase();
                var bSearch = !sSearch ||
                    (p.projectNumber || "").toLowerCase().includes(sSearch) ||
                    (p.parcelId || "").toLowerCase().includes(sSearch) ||
                    (p.ownerName || "").toLowerCase().includes(sSearch) ||
                    (p.address || "").toLowerCase().includes(sSearch);
                return bRole && bStatus && bDate && bSearch;
            });
        },

        paginatePage: function (aProjects, iPage, iPageSize) {
            var iStart = (iPage - 1) * iPageSize;
            return aProjects.slice(iStart, iStart + iPageSize);
        }
    };
});
