sap.ui.define([], function () {
    "use strict";

    // Mock contractor registry — keyed by tradeLicenceNo and name.
    var _contractors = [
        {
            contractorId:          "CONT001",
            contractorNo:          "112338854",
            name:                  "Abdullah Al-Aziz",
            tradeLicenceNo:        "463321",
            tradeLicenceExpiry:    "Apr 17, 2028",
            registrationExpiry:    "Apr 17, 2028",
            identificationType:    "TRADE_LICENSE"
        },
        {
            contractorId:          "CONT002",
            contractorNo:          "998877665",
            name:                  "Gulf Build Contracting LLC",
            tradeLicenceNo:        "887766",
            tradeLicenceExpiry:    "Dec 31, 2026",
            registrationExpiry:    "Dec 31, 2026",
            identificationType:    "TRADE_LICENSE"
        }
    ];

    return {
        findByTradeLicence: function (sLicenceNo) {
            var sTrimmed = (sLicenceNo || "").trim();
            var oFound = _contractors.find(function (c) {
                return c.tradeLicenceNo === sTrimmed;
            });
            return Promise.resolve(oFound || null);
        },

        findByName: function (sName) {
            var sSearch = (sName || "").trim().toLowerCase();
            if (!sSearch) { return Promise.resolve([]); }
            return Promise.resolve(_contractors.filter(function (c) {
                return c.name.toLowerCase().indexOf(sSearch) !== -1;
            }));
        }
    };
});
