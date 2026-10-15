sap.ui.define([
    "rak/services/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp03/ZP03ServiceFacade",
    "rak/services/service/zp03/ZP03ValidationService"
], function (BaseController, JSONModel, MessageToast, MessageBox, ZP03ServiceFacade, ZP03ValidationService) {
    "use strict";

    var SELECTED_NOC_KEY = "rak.services.zp03.modify.selectedNoc";
    var DETAILS_KEY = "rak.services.zp03.modify.details";

    function clone(o) {
        return JSON.parse(JSON.stringify(o || {}));
    }

    function readJson(sKey) {
        try {
            var s = window.sessionStorage.getItem(sKey);
            return s ? JSON.parse(s) : null;
        } catch (e) {
            return null;
        }
    }

    function writeJson(sKey, oValue) {
        try {
            if (oValue) {
                window.sessionStorage.setItem(sKey, JSON.stringify(oValue));
            } else {
                window.sessionStorage.removeItem(sKey);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function emptyErrors() {
        return {
            name: { valueState: "None", valueStateText: "" },
            email: { valueState: "None", valueStateText: "" },
            mobile: { valueState: "None", valueStateText: "" }
        };
    }

    return BaseController.extend("rak.services.controller.zp03.modify.Details", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");
            this.getView().setModel(new JSONModel({
                busy: false,
                activeStep: 2,
                stepLabels: [],
                existingNoc: {},
                applicant: {},
                project: {},
                projectManager: { name: "", email: "", mobile: "" },
                comments: "",
                errors: emptyErrors()
            }), "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp03-details")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var that = this;
            var oRouter = this.getOwnerComponent().getRouter();
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oViewModel = this.getView().getModel("view");
            var oSelected = oAppState.getProperty("/zp03/modify/selectedNoc") || readJson(SELECTED_NOC_KEY);

            oAppState.setProperty("/activeService", "zp03");

            if (oSelected && !oAppState.getProperty("/zp03/modify/selectedNoc")) {
                oAppState.setProperty("/zp03/modify/selectedNoc", oSelected);
            }

            var oEligibility = ZP03ValidationService.validateNocSelection(oSelected);
            if (!oEligibility.valid) {
                oRouter.navTo("zp03-select-noc", {}, true);
                return;
            }

            oViewModel.setProperty("/busy", true);
            oViewModel.setProperty("/errors", emptyErrors());

            Promise.all([
                ZP03ServiceFacade.getModifyStepperLabels(),
                ZP03ServiceFacade.getModifyDetails(oSelected)
            ]).then(function (aResults) {
                oViewModel.setProperty("/stepLabels", aResults[0] || []);
                var oDetails = aResults[1] || {};

                // Restore in-progress edits from appState / session if same NOC
                var oSaved = oAppState.getProperty("/zp03/modify/details") || readJson(DETAILS_KEY);
                if (oSaved && oSaved.nocId === oSelected.nocId) {
                    oDetails.projectManager = oSaved.projectManager || oDetails.projectManager;
                    oDetails.comments = oSaved.comments != null ? oSaved.comments : oDetails.comments;
                }

                oViewModel.setProperty("/existingNoc", oDetails.existingNoc || {});
                oViewModel.setProperty("/applicant", oDetails.applicant || {});
                oViewModel.setProperty("/project", oDetails.project || {});
                oViewModel.setProperty("/projectManager", oDetails.projectManager || { name: "", email: "", mobile: "" });
                oViewModel.setProperty("/comments", oDetails.comments || "");

                that._persistDetails(oSelected.nocId);
            }).catch(function () {
                MessageToast.show("Unable to load modification details.");
            }).finally(function () {
                oViewModel.setProperty("/busy", false);
            });
        },

        _collectDetailsPayload: function () {
            var oViewModel = this.getView().getModel("view");
            return {
                projectManager: clone(oViewModel.getProperty("/projectManager")),
                comments: oViewModel.getProperty("/comments") || "",
                existingNoc: clone(oViewModel.getProperty("/existingNoc")),
                applicant: clone(oViewModel.getProperty("/applicant")),
                project: clone(oViewModel.getProperty("/project"))
            };
        },

        _persistDetails: function (sNocId) {
            var oPayload = this._collectDetailsPayload();
            oPayload.nocId = sNocId;
            this.getOwnerComponent().getModel("appState").setProperty("/zp03/modify/details", oPayload);
            writeJson(DETAILS_KEY, oPayload);
        },

        _applyFieldErrors: function (oFields) {
            this.getView().getModel("view").setProperty("/errors", oFields || emptyErrors());
        },

        onPmLiveChange: function () {
            // Clear error state on edit; full validation runs on Next / Draft
            this._applyFieldErrors(emptyErrors());
            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            this._persistDetails(oSelected && oSelected.nocId);
        },

        onCommentsLiveChange: function () {
            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            this._persistDetails(oSelected && oSelected.nocId);
        },

        onNext: function () {
            var oPayload = this._collectDetailsPayload();
            var oResult = ZP03ValidationService.validateModificationDetails(oPayload);
            this._applyFieldErrors(oResult.fields);

            if (!oResult.valid) {
                return;
            }

            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            this._persistDetails(oSelected && oSelected.nocId);
            this.getOwnerComponent().getRouter().navTo("zp03-work-location");
        },

        onBack: function () {
            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            this._persistDetails(oSelected && oSelected.nocId);
            this.getOwnerComponent().getRouter().navTo("zp03-select-noc");
        },

        /**
         * FR017 — draft validation separate from Next (BR02).
         */
        onSaveAsDraft: function () {
            var that = this;
            var oPayload = this._collectDetailsPayload();
            var oDraftCheck = ZP03ValidationService.validateDraftAtModificationDetails(oPayload);
            this._applyFieldErrors(oDraftCheck.fields || emptyErrors());

            if (!oDraftCheck.valid) {
                MessageBox.error(oDraftCheck.message || "Please complete Project Manager details before saving the draft.");
                return;
            }

            var oSelected = this.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
            this._persistDetails(oSelected && oSelected.nocId);

            ZP03ServiceFacade.saveModifyDraft({
                selectedNoc: oSelected ? clone(oSelected) : null,
                details: oPayload
            }).then(function (oDraft) {
                that.getOwnerComponent().getModel("appState").setProperty("/zp03/modify/draft", oDraft);
                MessageToast.show(
                    "Draft saved (mock). Case number: " + (oDraft.caseNumber || "—") +
                    ". Status: " + (oDraft.status || "Saved as Draft")
                );
            }).catch(function () {
                MessageBox.error("Unable to save draft. Backend draft API is not connected yet.");
            });
        },

        onDelete: function () {
            MessageBox.information(
                "Delete is shown per Figma MOD-02 chrome but is not defined in BRD V1.4 " +
                "§4.4.2.3 (FR015–FR020) for the Modify applicant journey.\n\n" +
                "Clarification required before enabling destructive delete."
            );
        },

        formatOwnerLine: function (sName) {
            if (sName) {
                return "Owner " + sName;
            }
            var oBundle = this.getView().getModel("i18n") && this.getView().getModel("i18n").getResourceBundle();
            return oBundle ? oBundle.getText("zp03OwnerFallback") : "Owner";
        },

        formatStatusLabel: function (sStatus) {
            var s = String(sStatus || "").toUpperCase();
            if (!s) {
                return "—";
            }
            return s.charAt(0) + s.slice(1).toLowerCase();
        },

        formatDate: function (sISO) {
            if (!sISO) {
                return "—";
            }
            var d = new Date(String(sISO).substring(0, 10) + "T00:00:00");
            if (isNaN(d.getTime())) {
                return sISO;
            }
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }
    });
});
