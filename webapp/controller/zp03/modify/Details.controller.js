sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "rak/services/service/zp03/ZP03ServiceFacade",
    "rak/services/service/zp03/ZP03ValidationService"
], function (Controller, JSONModel, ZP03ServiceFacade, ZP03ValidationService) {
    "use strict";

    return Controller.extend("rak.services.controller.zp03.modify.Details", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");
            this.setModel(new JSONModel({
                activeStep: 2,
                stepLabels: []
            }), "view");
            this.getOwnerComponent().getRouter()
                .getRoute("zp03-details")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            var oValidation = ZP03ValidationService.validateNocSelection(oSelected);

            // Navigation guard: Details requires an eligible selected NOC
            if (!oValidation.valid) {
                oRouter.navTo("zp03-select-noc", {}, true);
                return;
            }

            var oViewModel = this.getModel("view");
            ZP03ServiceFacade.getModifyStepperLabels().then(function (aLabels) {
                oViewModel.setProperty("/stepLabels", aLabels);
            });
        },

        onNext: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-work-location");
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-select-noc");
        },

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }

    });
});
