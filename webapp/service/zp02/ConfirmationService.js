sap.ui.define([], function () {
    "use strict";

    /* Stable session-level counter — ensures IDs increment per app session but
       do NOT regenerate on every route-match (requirement BL04 / FN05). */
    var _iSessionCounter = null;

    function _getCounter() {
        if (_iSessionCounter === null) {
            _iSessionCounter = Math.floor(Math.random() * 900) + 100; // 100–999
        }
        return _iSessionCounter;
    }

    function _pad(n, digits) {
        var s = String(n);
        while (s.length < digits) { s = "0" + s; }
        return s;
    }

    return {

        /* ── REQ-ZP02-XXXXXX ──────────────────────────────────────────── */
        generateRequestId: function () {
            return "REQ-ZP02-" + _pad(_getCounter(), 6);
        },

        /* ── BLD-001, BLD-002 … (one per building object in array) ─────── */
        generateBuildingIds: function (aBuildings) {
            if (!aBuildings || aBuildings.length === 0) { return []; }
            return aBuildings.map(function (oBuilding, i) {
                return "BLD-" + _pad(i + 1, 3);
            });
        },

        /* ── FNC-001, FNC-002 … (one per fence object in array) ─────────── */
        generateFenceIds: function (aFences) {
            if (!aFences || aFences.length === 0) { return []; }
            return aFences.map(function (oFence, i) {
                return "FNC-" + _pad(i + 1, 3);
            });
        },

        /* ── Assemble the full confirmation record from appState values ──── */
        buildConfirmation: function (oAppState) {
            var oProject   = oAppState.getProperty("/selectedProject") || {};
            var oStep3     = oAppState.getProperty("/step3") || {};
            var aBuildings = oStep3.buildings || [];
            var aFences    = oStep3.fences    || [];

            return {
                requestId:    this.generateRequestId(),
                ownerName:    oProject.ownerName  || "",
                projectNumber: oProject.projectNumber || "",
                address:      oProject.address    || "",
                buildingIds:  this.generateBuildingIds(aBuildings),
                fenceIds:     this.generateFenceIds(aFences),
                generatedAt:  new Date().toISOString()
            };
        }

    };
});
