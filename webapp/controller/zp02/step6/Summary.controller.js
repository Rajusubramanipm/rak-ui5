sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp02/SummaryService"
], function (Controller, JSONModel, MessageToast, MessageBox, SummaryService) {
    "use strict";

    /* BRD_CROSS_REFERENCE_RESOLUTION:
       US-ZP02-008 references MSG-C08, but Appendix 5.5.1 explicitly maps
       Summary Submit confirmation to MSG-C02. MSG-C02 is used. */

    var STEP_LABELS = [
        "Select Project",
        "Permit Information",
        "Fences & Buildings",
        "Business Partners",
        "Attachments",
        "Summary"
    ];

    return Controller.extend("rak.services.controller.zp02.step6.Summary", {

        onInit: function () {
            var oViewModel = new JSONModel({
                activeStep: 6,
                stepLabels: STEP_LABELS,
                summary: {
                    context:           { ownerName: "", projectNumber: "", address: "" },
                    permit:            {
                        etisalatNocNo:        "",
                        eweNocNo:             "",
                        civilDefenceAreaText: "",
                        showEtisalatNoc:      true,
                        showGrantFields:      false,
                        grantTypeText:        "",
                        grantExpiryDate:      ""
                    },
                    engineers:         [],
                    contractor:        null,
                    contractorVisible: false,
                    ewe:               null,
                    eweVisible:        true,
                    buildings:         [],
                    fences:            [],
                    attachments:       []
                }
            });
            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-summary")
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

            var oData = SummaryService.aggregateFromAppState(oAppState);
            this.getView().getModel("view").setProperty("/summary", oData);
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // ── Edit navigation ──────────────────────────────────────────

        onEditPermit: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-permit-information");
        },

        onEditEngineers: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-business-partners");
        },

        onEditContractor: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-business-partners");
        },

        onEditEwe: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-business-partners");
        },

        onEditBuildings: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-fences-buildings");
        },

        onEditFences: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-fences-buildings");
        },

        onEditAttachments: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-attachments");
        },

        // ── Submit (MSG-C02) ─────────────────────────────────────────

        onSubmit: function () {
            var oSelf = this;
            var sSubmitBtn = this._getText("msgC02BtnSubmit");
            MessageBox.confirm(
                this._getText("msgC02Body"),
                {
                    title:            this._getText("msgC02Title"),
                    actions:          [sSubmitBtn, MessageBox.Action.CANCEL],
                    emphasizedAction: sSubmitBtn,
                    onClose: function (sAction) {
                        if (sAction === sSubmitBtn) {
                            oSelf._doSubmit();
                        }
                    }
                }
            );
        },

        _doSubmit: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            // Record frontend submission state only — no backend call
            oAppState.setProperty("/step6", { submittedFrontend: true });
            this.getOwnerComponent().getRouter().navTo("zp02-payment");
        },

        // ── Footer actions ───────────────────────────────────────────

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-attachments");
        },

        onSaveDraft: function () {
            MessageToast.show(this._getText("msgC03SaveDraftSuccess"));
        },

        onDelete: function () {
            var oSelf = this;
            MessageBox.confirm(this._getText("msgC01DeleteConfirm"), {
                title:   this._getText("msgC01DeleteConfirmTitle"),
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oSelf.getOwnerComponent().getRouter().navTo("zp02-project-selection");
                    }
                }
            });
        }

    });
});
