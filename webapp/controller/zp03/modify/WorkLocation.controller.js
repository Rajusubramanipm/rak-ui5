sap.ui.define([
    "rak/services/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "rak/services/service/zp03/ZP03ServiceFacade"
], function (BaseController, JSONModel, ZP03ServiceFacade) {
    "use strict";

    return BaseController.extend("rak.services.controller.zp03.modify.WorkLocation", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");
            this.getView().setModel(new JSONModel({
                activeStep: 3,
                stepLabels: []
            }), "view");
            this.getOwnerComponent().getRouter()
                .getRoute("zp03-work-location")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oViewModel = this.getView().getModel("view");
            ZP03ServiceFacade.getModifyStepperLabels().then(function (aLabels) {
                oViewModel.setProperty("/stepLabels", aLabels);
            });
        },

        onNext: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-attachments");
        },
        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp03-details");
        },
        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }

    });
});
