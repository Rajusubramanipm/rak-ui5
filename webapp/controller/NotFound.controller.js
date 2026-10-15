sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("rak.services.controller.NotFound", {
        onNavHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }
    });
});
