sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("rak.services.controller.Home", {

        onInit: function () {
        },

        onNavigateToZp02: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/activeService", "zp02");
            this.getOwnerComponent().getRouter().navTo("zp02-new-building-permit");
        },

        onNavigateToZp03: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/activeService", "zp03");
            this.getOwnerComponent().getRouter().navTo("zp03-modify-infrastructure-noc");
        }

    });
});
