sap.ui.define([
    "rak/services/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "rak/services/service/zp03/ZP03ServiceFacade"
], function (BaseController, JSONModel, ZP03ServiceFacade) {
    "use strict";

    return BaseController.extend("rak.services.controller.zp03.modify.Attachments", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");
            this.getView().setModel(new JSONModel({
                activeStep: 4,
                stepLabels: []
            }), "view");
            this.getOwnerComponent().getRouter()
                .getRoute("zp03-attachments")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oViewModel = this.getView().getModel("view");
            ZP03ServiceFacade.getModifyStepperLabels().then(function (aLabels) {
                oViewModel.setProperty("/stepLabels", aLabels);
            });
        },

        onNext: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-review");
        },
        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-work-location");
        },
        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }

    });
});
