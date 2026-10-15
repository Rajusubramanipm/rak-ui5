sap.ui.define([
    "rak/services/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "rak/services/service/zp03/ZP03ServiceFacade"
], function (BaseController, JSONModel, ZP03ServiceFacade) {
    "use strict";

    return BaseController.extend("rak.services.controller.zp03.modify.Confirmation", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");
            // Post-submission destination — not a MOD-01..05 stepper step.
            // activeStep beyond label count marks all journey steps completed.
            this.getView().setModel(new JSONModel({
                activeStep: 6,
                stepLabels: []
            }), "view");
            this.getOwnerComponent().getRouter()
                .getRoute("zp03-confirmation")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oViewModel = this.getView().getModel("view");
            ZP03ServiceFacade.getModifyStepperLabels().then(function (aLabels) {
                oViewModel.setProperty("/stepLabels", aLabels);
            });
        },

        
        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-review");
        },
        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }

    });
});
