sap.ui.define(["sap/ui/core/Control"], function (Control) {
    "use strict";

    /**
     * Shared RAK application footer / action-bar shell.
     * Placeholder control — existing ZP02 views still use inline footer actions.
     */
    return Control.extend("rak.services.control.RakFooter", {
        metadata: {
            properties: {
                backVisible: { type: "boolean", defaultValue: true },
                nextVisible: { type: "boolean", defaultValue: true },
                nextEnabled: { type: "boolean", defaultValue: true },
                nextText: { type: "string", defaultValue: "Next" },
                backText: { type: "string", defaultValue: "Back" }
            },
            events: {
                back: {},
                next: {}
            }
        },

        renderer: {
            apiVersion: 2,
            render: function (oRm, oCtrl) {
                oRm.openStart("div", oCtrl).class("rakFooter").class("rakFooter--shell").openEnd();
                oRm.openStart("span").class("rakFooter__shellLabel").openEnd();
                oRm.text("RAK Services Footer");
                oRm.close("span");
                oRm.close("div");
            }
        }
    });
});
