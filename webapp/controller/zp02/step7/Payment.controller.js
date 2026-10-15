sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp02/PaymentService"
], function (Controller, JSONModel, MessageToast, MessageBox, PaymentService) {
    "use strict";

    var STEP_LABELS = [
        "Select Project",
        "Permit Information",
        "Fences & Buildings",
        "Business Partners",
        "Attachments",
        "Summary",
        "Payment"
    ];

    /* Map method key → button ID suffix */
    var METHOD_BTN = {
        RAK_AE:  "RAKAE",
        M_RAK:   "MRAK",
        KIOSK:   "KIOSK",
        WALK_IN: "WALKIN"
    };

    return Controller.extend("rak.services.controller.zp02.step7.Payment", {

        onInit: function () {
            var oViewModel = new JSONModel({
                activeStep:       7,
                stepLabels:       STEP_LABELS,
                extraSteps:       1,
                feeLines:         [],
                total:            "0.00",
                estimatedFees:    [],
                estimatedTotal:   "0.00",
                accountDetails:   { number: "", caseNumber: "" },
                paymentMethod:    null,
                isProcessing:     false,
                validationError:  ""
            });
            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-payment")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oProject  = oAppState ? oAppState.getProperty("/selectedProject") : null;

            if (!oProject) {
                oProject = {
                    projectId: "PRJ-001",
                    parcelId: "409030901",
                    projectNumber: "409030901",
                    ownerName: "Abdullah Al-Aziz",
                    address: "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
                };
                if (oAppState) {
                    oAppState.setProperty("/selectedProject", oProject);
                }
            }

            var oVM = this.getView().getModel("view");

            /* Load fees via PaymentService */
            var aFees = PaymentService.getInitialFees();
            var sTotal = PaymentService.calculateInitialTotal(aFees);
            var aEst   = PaymentService.getEstimatedFinalFees();
            var sEst   = PaymentService.calculateEstimatedTotal(aEst);
            var oAcct  = PaymentService.getAccountDetails();

            oVM.setProperty("/feeLines",       aFees);
            oVM.setProperty("/total",          sTotal);
            oVM.setProperty("/estimatedFees",  aEst);
            oVM.setProperty("/estimatedTotal", sEst);
            oVM.setProperty("/accountDetails", oAcct);

            /* Restore previously selected method from appState */
            var sSavedMethod = oAppState.getProperty("/step7/selectedPaymentMethod");
            oVM.setProperty("/validationError", "");
            oVM.setProperty("/isProcessing", false);

            /* Reset payment status (bypass: allow revisiting payment in prototype) */
            oAppState.setProperty("/step7/paymentStatus", "IDLE");
            this._applyMethodSelection(sSavedMethod || null);
        },

        /* ── Method selection ─────────────────────────────────────── */

        onMethodPress: function (oEvent) {
            var sMethod = oEvent.getSource().data("method");
            this._applyMethodSelection(sMethod);
            /* Clear validation error on selection */
            this.getView().getModel("view").setProperty("/validationError", "");
            /* Persist to appState */
            this.getOwnerComponent().getModel("appState")
                .setProperty("/step7/selectedPaymentMethod", sMethod);
        },

        _applyMethodSelection: function (sMethod) {
            var oVM = this.getView().getModel("view");
            oVM.setProperty("/paymentMethod", sMethod);

            /* Toggle CSS class on each card button */
            var that = this;
            Object.keys(METHOD_BTN).forEach(function (key) {
                var oBtn = that.byId("btn" + METHOD_BTN[key]);
                if (oBtn) {
                    oBtn.toggleStyleClass("rakPayMethodCard--selected", key === sMethod);
                }
            });
        },

        /* ── Estimated fees dialog ────────────────────────────────── */

        onViewEstimatedFees: function () {
            this._getEstimatedDialog().open();
        },

        onCloseEstimatedFees: function () {
            this._getEstimatedDialog().close();
        },

        _getEstimatedDialog: function () {
            return this.byId("estimatedFeesDialog");
        },

        /* ── Email details (mock — no real email) ─────────────────── */

        onEmailDetails: function () {
            MessageToast.show("Details have been sent to your registered email address.");
        },

        /* ── Pay ──────────────────────────────────────────────────── */

        onPay: function () {
            var oVM       = this.getView().getModel("view");
            var oAppState = this.getOwnerComponent().getModel("appState");
            var sMethod   = oVM.getProperty("/paymentMethod");

            /* PV01: no method selected → MSG-V02 */
            if (!sMethod) {
                var sBundle = this.getView().getModel("i18n").getResourceBundle();
                oVM.setProperty("/validationError",
                    sBundle.getText("msgV02PaymentMethod"));
                return;
            }

            /* PR02: prevent duplicate click */
            if (oVM.getProperty("/isProcessing")) { return; }

            /* PR01/PR03: enter PROCESSING state */
            oVM.setProperty("/isProcessing", true);
            oVM.setProperty("/validationError", "");
            oAppState.setProperty("/step7/paymentStatus", "PROCESSING");

            var that = this;
            setTimeout(function () {
                /* SC02: no backend call — pure frontend simulation */
                var oResult = PaymentService.simulatePayment(sMethod, { simulateFailure: false });

                if (oResult.success) {
                    /* SC01/SC03: success */
                    oAppState.setProperty("/step7/paymentStatus", "SUCCESS");
                    oVM.setProperty("/isProcessing", false);
                    that.getOwnerComponent().getRouter().navTo("zp02-confirmation");
                } else {
                    /* FL02: MSG-F04 */
                    oAppState.setProperty("/step7/paymentStatus", "FAILED");
                    oVM.setProperty("/isProcessing", false);
                    var sBundle2 = that.getView().getModel("i18n").getResourceBundle();
                    MessageBox.error(sBundle2.getText("msgF04PaymentFailed"));
                }
            }, 800);
        },

        /* ── Navigation ───────────────────────────────────────────── */

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-summary");
        },

        onSaveDraft: function () {
            var sMsg = this.getView().getModel("i18n").getResourceBundle().getText("msgC03SaveDraftSuccess");
            MessageToast.show(sMsg);
        },

        onDelete: function () {
            var that = this;
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            MessageBox.confirm(oBundle.getText("msgC01DeleteConfirm"), {
                title:   oBundle.getText("msgC01DeleteConfirmTitle"),
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that.getOwnerComponent().getRouter().navTo("zp02-project-selection");
                    }
                }
            });
        }

    });
});
