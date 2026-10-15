sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "rak/services/service/zp02/ConfirmationService"
], function (Controller, JSONModel, MessageToast, ConfirmationService) {
    "use strict";

    var STEP_LABELS = [
        "Select Project",
        "Permit Information",
        "Fences & Buildings",
        "Business Partners",
        "Attachments",
        "Summary",
        "Payment",
        "Confirmation"
    ];

    return Controller.extend("rak.services.controller.zp02.step8.Confirmation", {

        onInit: function () {
            var oViewModel = new JSONModel({
                activeStep:      8,
                stepLabels:      STEP_LABELS,
                extraSteps:      0,
                requestId:       "",
                ownerName:       "",
                buildingIds:     [],
                fenceIds:        [],
                buildingIdsText: "",
                fenceIdsText:    "",
                hasFenceIds:     false
            });
            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-confirmation")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");

            /* Fallback mock project if direct routing */
            if (!oAppState.getProperty("/selectedProject")) {
                var oProject = {
                    projectId: "PRJ-001",
                    parcelId: "409030901",
                    projectNumber: "409030901",
                    ownerName: "Abdullah Al-Aziz",
                    address: "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
                };
                oAppState.setProperty("/selectedProject", oProject);
            }

            /* RT03: payment not completed → redirect to payment (bypass for prototype) */
            var sPayStatus = oAppState.getProperty("/step7/paymentStatus");
            if (sPayStatus !== "SUCCESS") {
                oAppState.setProperty("/step7", { paymentStatus: "SUCCESS", method: "CARD", total: 270 });
            }

            this._loadConfirmation(oAppState);
        },

        _loadConfirmation: function (oAppState) {
            var oVM    = this.getView().getModel("view");
            var oStep8 = oAppState.getProperty("/step8") || {};

            /* CF03 / BL04 / FN05 — IDs generated once per session; reuse if already set */
            if (!oStep8.requestId) {
                var oConf = ConfirmationService.buildConfirmation(oAppState);
                oStep8 = oConf;
                oAppState.setProperty("/step8", {
                    requestId:   oConf.requestId,
                    buildingIds: oConf.buildingIds,
                    fenceIds:    oConf.fenceIds,
                    generatedAt: oConf.generatedAt
                });
            }

            var aBuildingIds = oStep8.buildingIds || [];
            var aFenceIds    = oStep8.fenceIds    || [];

            oVM.setProperty("/requestId",       oStep8.requestId || "");
            oVM.setProperty("/ownerName",
                oAppState.getProperty("/selectedProject/ownerName") || "");
            oVM.setProperty("/buildingIds",     aBuildingIds);
            oVM.setProperty("/fenceIds",        aFenceIds);
            oVM.setProperty("/buildingIdsText",
                aBuildingIds.length > 0 ? aBuildingIds.join(", ") : "—");
            oVM.setProperty("/fenceIdsText",
                aFenceIds.length > 0 ? aFenceIds.join(", ") : "");
            oVM.setProperty("/hasFenceIds",     aFenceIds.length > 0);
        },

        /* ── Print ────────────────────────────────────────────────── */
        onPrint: function () {
            window.print();
        },

        /* ── Back to Home ─────────────────────────────────────────── */
        onBackHome: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-project-selection");
        },

        /* ── UAE Pass QR (no real integration) ───────────────────── */
        onUaePassQr: function () {
            MessageToast.show("UAE Pass is not integrated in this local implementation.");
        },

        /* ── Navigate to Step 9 Drawing Upload ───────────────────── */
        onUploadDrawings: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-drawing-upload");
        }

    });
});
