sap.ui.define(["sap/ui/core/Control"], function (Control) {
    "use strict";

    /* Shared RAK stepper — supports dynamic stepLabels for ZP02 and ZP03.
       When stepLabels is empty, falls back to ZP02 New Building Permit defaults.
       Windowing: up to VISIBLE steps shown; earlier/later steps collapse to nav chips. */
    var ZP02_DEFAULT_STEPS = [
        "Select Project", "Permit Information", "Fences & Buildings", "Business Partners",
        "Attachments", "Summary", "Payment", "Confirmation"
    ];
    var VISIBLE = 6;

    function resolveLabels(aGiven) {
        if (aGiven && aGiven.length) {
            return aGiven.slice();
        }
        return ZP02_DEFAULT_STEPS.slice();
    }

    function renderNav(oRm, sLabel, bBack) {
        oRm.openStart("div").class("rakStepper__item").class("rakStepper__item--nav")
            .attr("role", "listitem").openEnd();
        oRm.openStart("div").class("rakStepper__circle").class("rakStepper__circle--more")
            .attr("aria-hidden", "true").openEnd();
        oRm.voidStart("img").class("rakStepper__arrow");
        if (bBack) { oRm.class("rakStepper__arrow--back"); }
        oRm.attr("src", sap.ui.require.toUrl("rak/services/assets/figma/common/stepper/arrow.svg"))
            .attr("alt", "").voidEnd();
        oRm.close("div");
        oRm.openStart("div").class("rakStepper__label").class("rakStepper__label--more").openEnd();
        oRm.text(sLabel);
        oRm.close("div");
        oRm.close("div");
    }

    return Control.extend("rak.services.control.RakStepper", {

        metadata: {
            properties: {
                activeStep:  { type: "int",      defaultValue: 1  },
                stepLabels:  { type: "string[]", defaultValue: [] },
                /* Kept for view compatibility; the window is derived from activeStep. */
                extraSteps:  { type: "int",      defaultValue: 0  }
            },
            events: {}
        },

        renderer: {
            apiVersion: 2,

            render: function (oRm, oCtrl) {
                var iActive  = oCtrl.getActiveStep();
                var aLabels  = resolveLabels(oCtrl.getStepLabels());
                var iTotal   = aLabels.length;
                var iVisible = Math.min(VISIBLE, iTotal);
                var iFirst   = iActive > iVisible ? iTotal - iVisible + 1 : 1;
                if (iFirst < 1) { iFirst = 1; }
                var iLast    = Math.min(iFirst + iVisible - 1, iTotal);
                var sCheck   = sap.ui.require.toUrl("rak/services/assets/figma/common/stepper/check.svg");

                oRm.openStart("div", oCtrl);
                oRm.class("rakStepper");
                oRm.attr("role", "list");
                oRm.attr("aria-label", "Application progress");
                oRm.openEnd();

                if (iFirst > 1) {
                    renderNav(oRm, (iFirst - 1) + " Previous steps", true);
                }

                for (var iStep = iFirst; iStep <= iLast; iStep++) {
                    var sLabel     = aLabels[iStep - 1];
                    var bActive    = iStep === iActive;
                    var bCompleted = iStep < iActive;

                    oRm.openStart("div");
                    oRm.class("rakStepper__item");
                    oRm.attr("role", "listitem");
                    if (bActive)    oRm.attr("aria-current", "step");
                    if (bCompleted) oRm.attr("aria-label", sLabel + " (completed)");
                    oRm.openEnd();

                    oRm.openStart("div");
                    oRm.class("rakStepper__circle");
                    if (bActive)         oRm.class("rakStepper__circle--active");
                    else if (bCompleted) oRm.class("rakStepper__circle--completed");
                    else                 oRm.class("rakStepper__circle--inactive");
                    oRm.attr("aria-hidden", "true");
                    oRm.openEnd();
                    oRm.openStart("span").class("rakStepper__num").openEnd();
                    oRm.text(String(iStep));
                    oRm.close("span");
                    if (bCompleted) {
                        oRm.openStart("span").class("rakStepper__badge").openEnd();
                        oRm.voidStart("img").attr("src", sCheck).attr("alt", "").voidEnd();
                        oRm.close("span");
                    }
                    oRm.close("div");

                    oRm.openStart("div");
                    oRm.class("rakStepper__label");
                    if (bActive)    oRm.class("rakStepper__label--active");
                    if (bCompleted) oRm.class("rakStepper__label--completed");
                    oRm.attr("title", sLabel);
                    oRm.openEnd();
                    oRm.text(sLabel);
                    oRm.close("div");

                    oRm.close("div"); // item
                }

                if (iLast < iTotal) {
                    renderNav(oRm, (iTotal - iLast) + " More steps", false);
                }

                oRm.close("div"); // rakStepper
            }
        }
    });
});
