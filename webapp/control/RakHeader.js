sap.ui.define(["sap/ui/core/Control"], function (Control) {
    "use strict";

    /**
     * Shared RAK application header shell.
     * Placeholder control — existing ZP02 views still use inline header markup.
     * Extract and adopt this control in a later UI refactor pass.
     */
    return Control.extend("rak.services.control.RakHeader", {
        metadata: {
            properties: {
                userName: { type: "string", defaultValue: "" },
                showUserMenu: { type: "boolean", defaultValue: true }
            },
            events: {
                userMenuPress: {}
            }
        },

        renderer: {
            apiVersion: 2,
            render: function (oRm, oCtrl) {
                oRm.openStart("div", oCtrl).class("rakHeader").class("rakHeader--shell").openEnd();
                oRm.openStart("span").class("rakHeader__shellLabel").openEnd();
                oRm.text("RAK Services Header");
                oRm.close("span");
                if (oCtrl.getUserName()) {
                    oRm.openStart("span").class("rakHeader__shellUser").openEnd();
                    oRm.text(oCtrl.getUserName());
                    oRm.close("span");
                }
                oRm.close("div");
            }
        }
    });
});
